import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {inject, Injectable} from '@angular/core';
import {
    Auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from '@angular/fire/auth';
import {collection, deleteDoc, doc, Firestore, getDocs, query, setDoc, where} from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})
export class UserDB implements UserRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    /**
     * Crea un usuario en Firebase Auth y sus datos correspondientes en Firestore.
     * @throws error error de Firestore
     */
    async createUser(email: string, pwd: string, nombre: string, apellidos: string): Promise<UserModel> {
        // 1. Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, pwd);
        const firebaseUser = userCredential.user;
        const uid = firebaseUser.uid;

        try {
            // 2. Intentar actualizar perfil Auth para el nombre del usuario
            await updateProfile(firebaseUser, {displayName: `${nombre} ${apellidos}`});

            // 3. Crear modelo y referencia al documento de Firestore
            const userModel = new UserModel(uid, email, nombre, apellidos);
            const userDocRef = doc(this.firestore, `users/${uid}`);

            // 4. Escribir en Firestore
            await setDoc(userDocRef, userModel.toJSON());

            return userModel;
        } catch (error) {
            // ERROR CRÍTICO: Falla la escritura en DB o el updateProfile. Rollback
            try {
                await firebaseUser.delete();
            } catch (error) {
                console.error('FATAL: Inconsistencia de datos. Usuario creado en Auth, pero no en Firestore. Rollback ha fallado.', error);
            }
            throw error;
        }
    }

    /**
     * Borra el usuario autenticado.
     */
    async deleteAuthUser(): Promise<boolean> {
        const user = this.auth.currentUser;

        // 1. Borrar de Firestore
        const userDocRef = doc(this.firestore, `users/${user?.uid}`);
        await deleteDoc(userDocRef);

        // 2. Luego borra de Firebase Auth (esto cierra la sesión automáticamente)
        await user!.delete();

        return true;
    }

    /**
     * Recibe un email y una contraseña e intenta iniciar sesión en Firebase.
     * @param email correo del usuario
     * @param password contraseña del usuario
     * @returns true si se ha podido iniciar sesión; error en caso contrario
     */
    async validateCredentials(email: string, password: string): Promise<boolean> {
        await signInWithEmailAndPassword(this.auth, email, password);
        return true;
    }

    /**
     * Intenta cerrar sesión en Firebase.
     * @returns Promise con true si se ha podido cerrar sesión; false en caso de excepción.
     */
    async logoutUser(): Promise<boolean> {
        try {
            await this.auth.signOut();
            return true;
        } catch (error: any) {
            return false;
        }
    }
}
