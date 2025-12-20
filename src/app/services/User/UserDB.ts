import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {inject, Injectable} from '@angular/core';
import {
    Auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile, validatePassword
} from '@angular/fire/auth';
import {collection, deleteDoc, doc, Firestore, getDoc, getDocs, query, setDoc, where} from '@angular/fire/firestore';
import {DBAccessError} from '../../errors/DBAccessError';

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
            throw new DBAccessError(error);
        }
    }

    /**
     * Borra el usuario autenticado.
     * @returns Promise con true si se ha borrado el usuario
     */
    async deleteAuthUser(): Promise<boolean> {
        const user = this.auth.currentUser;

        try {
            // Borrar de Firestore
            const userDocRef = doc(this.firestore, `users/${user?.uid}`);
            await deleteDoc(userDocRef);

            // Borra de Auth y cierra la sesión automáticamente
            await user!.delete();
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            throw new DBAccessError(error);
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
            throw new DBAccessError(error);
        }
    }

    /**
     * Recibe un email y comprueba si existe una cuenta en Firestore que lo utilice
     * @param email dirección de correo de un posible usuario
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
            throw new DBAccessError(error);
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
