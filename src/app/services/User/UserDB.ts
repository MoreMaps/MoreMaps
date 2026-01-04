import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {inject, Injectable} from '@angular/core';
import {
    Auth,
    createUserWithEmailAndPassword, deleteUser,
    signInWithEmailAndPassword,
    updateProfile, validatePassword
} from '@angular/fire/auth';
import {
    collection,
    doc,
    Firestore,
    getDoc,
    getDocs,
    query,
    setDoc,
    where,
    writeBatch
} from '@angular/fire/firestore';
import {DBAccessError} from '../../errors/DBAccessError';
import {ReauthNecessaryError} from '../../errors/User/ReauthNecessaryError';

@Injectable({
    providedIn: 'root'
})
export class UserDB implements UserRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    /**
     * Crea un usuario en Firebase Auth y sus datos correspondientes en Firestore.
     * @returns Promise con el UserModel creado.
     */
    async createUser(email: string, pwd: string, nombre: string, apellidos: string): Promise<UserModel> {
        try {
            // Crear usuario en Auth
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, pwd);

            // Intentar actualizar perfil de Auth para el nombre del usuario
            await updateProfile(userCredential.user, {displayName: `${nombre} ${apellidos}`});

            // Crear el modelo de usuario
            const userModel = new UserModel(userCredential.user.uid, email, nombre, apellidos);

            // Escribir en Firestore
            await setDoc(doc(this.firestore, `users/${userModel.uid}`), userModel.toJSON());

            return userModel;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Borra el usuario autenticado.
     * @returns Promise con true si se ha borrado el usuario
     * @throws ReauthNecessaryError si el token de sesión del usuario es demasiado antiguo (>5 minutos)
     */
    async deleteAuthUser(): Promise<boolean> {
        const user = this.auth.currentUser;
        const collections = ['pois', 'vehicles', 'routes'];

        try {
            // Borra los items del usuario
            // Una vez las colecciones de items están vacías, su borrado es automático
            const batch = writeBatch(this.firestore);
            for (const ref of collections) {
                const querySnap = await getDocs(query(collection(this.firestore, `items/${user?.uid}/${ref}`)));
                for (const docSnap of querySnap.docs) {
                    batch.delete(docSnap.ref);
                }
            }

            // Borra las preferencias del usuario
            const preferenceRef = doc(this.firestore, `preferences/${user?.uid}`);
            batch.delete(preferenceRef);

            // Borra al usuario de Firestore
            const userDocRef = doc(this.firestore, `users/${user?.uid}`);
            batch.delete(userDocRef);

            // Fin de la transacción
            await batch.commit();

            // Borra de Auth y cierra la sesión automáticamente
            await deleteUser(user!);

            // Comprobamos que se hayan borrado todos los items y preferencias de usuario, y el usuario en sí
            const itemsSnap = await getDoc(doc(this.firestore, `items/${user?.uid}`));
            const preferencesSnap = await getDoc(preferenceRef);
            const userSnap = await getDoc(userDocRef);
            return !(itemsSnap.exists() || preferencesSnap.exists() || userSnap.exists());
        }
        catch (error: any) {
            if (error.code === 'auth/requires-recent-login') {
                console.warn('El usuario necesita re-autenticarse para borrar la cuenta.');
                throw new ReauthNecessaryError();
            }

            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Recibe un email y una contraseña e intenta iniciar sesión en Firebase.
     * @param email correo del usuario
     * @param password contraseña del usuario
     * @returns true si se ha podido iniciar sesión; error en caso contrario
     */
    async validateCredentials(email: string, password: string): Promise<boolean> {
        try {
            await signInWithEmailAndPassword(this.auth, email, password);
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Recibe un email y comprueba si existe una cuenta en Firestore que lo utilice
     * @param email Dirección de correo de un posible usuario
     * @returns Promise con true si existe, false si no existe
     */
    async userExists(email: string): Promise<boolean> {
        const q = query(collection(this.firestore, `users`), where('email', '==', email));
        const res = await getDocs(q);
        return !res.empty;
    }

    /**
     * Intenta cerrar sesión en Firebase
     * @returns Promise con true si se ha podido cerrar sesión
     */
    async logoutUser(): Promise<boolean> {
        try {
            await this.auth.signOut();
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Devuelve el usuario con la sesión activa
     * @returns UserModel del usuario con la sesión
     */
    async getCurrentUser(): Promise<UserModel> {
        const snap = await getDoc(doc(this.firestore,`users/${this.auth.currentUser?.uid}`));
        return UserModel.fromJSON(snap.data());
    }

    /**
     * Comprueba si la sesión está activa
     * @returns Promise con true si la sesión está activa
     */
    async sessionActive(): Promise<boolean> {
        return !!this.auth.currentUser;
    }

    /**
     * Comprueba si la contraseña cumple la política de seguridad de Firestore
     * @returns Promise con true si la contraseña es válida
     */
    async passwordValid(password: string): Promise<boolean> {
        return (await validatePassword(this.auth, password)).isValid;
    }
}
