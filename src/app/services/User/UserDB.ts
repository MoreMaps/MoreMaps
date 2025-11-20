import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {doc, Firestore, setDoc} from '@angular/fire/firestore';
import {inject, Injectable, signal} from '@angular/core';
import {Auth, authState, createUserWithEmailAndPassword, updateProfile, User} from '@angular/fire/auth';
import {Observable} from 'rxjs';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {UserNotFoundError} from '../../errors/UserNotFoundError';

@Injectable({
    providedIn: 'root'
})
export class UserDB implements UserRepository {
    private firestore = inject(Firestore);
    private auth = inject(Auth);

    // Signal para el usuario actual
    currentUser = signal<User | null>(null);

    // Observable del estado de autenticación
    authState$: Observable<User | null> = authState(this.auth);

    constructor() {
        // Actualizar signal cuando cambie el estado de autenticación
        this.authState$.subscribe(user => {
            this.currentUser.set(user);
        });
    }

    async createUser(email: string, pwd: string, nombre: string, apellidos: string): Promise<UserModel> {
        // Crear usuario en Firebase Auth
        let userCredential;
        try{
            userCredential = await createUserWithEmailAndPassword(this.auth, email, pwd);
        } catch(error) {
            throw error;
        }

        const firebaseUser = userCredential.user;
        const uid = firebaseUser.uid;

        try {
            await updateProfile(firebaseUser, {displayName: `${nombre} ${apellidos}`});
        } catch (profileErr) {
            console.warn('updateProfile failed:', profileErr);
        }

        const userModel = new UserModel(uid, email, nombre, apellidos);

        const userDocRef = doc(this.firestore, `users/${uid}`);
        try {
            await setDoc(userDocRef, userModel.toJSON());
            return userModel;
        } catch (error) {
            console.error('Firestore write failed: ', error);
            try {
                await firebaseUser.delete()
            } catch (error) {
                console.error('Failed to rollback and delete the user: ', error);
            }
            throw error;
        }
    }

    async deleteUser(): Promise<boolean> {
        return false;
    }

    async validateCredentials(email: string, password: string): Promise<boolean> {
        return false;
    }

    /**
     * Intenta cerrar sesión en Firebase.
     * @returns Promise con true si se ha podido cerrar sesión; false en caso de excepción.
     */
    async logoutUser(): Promise<boolean> {
        // Obtiene el usuario de la sesión; si no hay, ya se ha cerrado la sesión
        const user = this.auth.currentUser;
        if (!user) throw new SessionNotActiveError();

        // Cierra la sesión del usuario
        this.auth.signOut().catch((error) => {

            // El usuario ya no existe (eliminar y cerrar sesión en pestañas distintas)
            if (error.code == 'auth/invalid-credential') {
                throw new UserNotFoundError();
            }

            // Error cualquiera
            console.error('ERROR de Firebase al borrar usuario: ' + error);
            return false;
        });
        return true;
    }
}
