import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {inject, Injectable, signal} from '@angular/core';
import {Observable} from 'rxjs';
import {Auth, authState, updateProfile, User, signInWithEmailAndPassword, createUserWithEmailAndPassword} from '@angular/fire/auth';
import {collection, Firestore, query, where, doc, getDocs, setDoc} from '@angular/fire/firestore';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {UserNotFoundError} from '../../errors/UserNotFoundError';
import {InvalidCredentialError} from '../../errors/InvalidCredentialError';
import {UserNotFoundError} from '../../errors/UserNotFoundError';

@Injectable({
    providedIn: 'root'
})
export class UserDB implements UserRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);
  
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

    /**
     * Recibe un email y una contraseña e intenta iniciar sesión en Firebase.
     * @param email correo del usuario
     * @param password contraseña del usuario
     * @returns Promise con true si se ha podido iniciar sesión; excepción en caso contrario.
     */
    async validateCredentials(email: string, password: string): Promise<boolean> {
        // Intento de inicio de sesión
        try {
            // Inicio de sesión en Firebase
            await signInWithEmailAndPassword(this.auth, email, password);
            // Devuelve true si no ha habido errores
            return true;
        } catch (error: any) {
            // Gestión del error de Firebase
            switch (error.code) {
                // email o contraseña inválidos
                case 'auth/invalid-credential': {
                    if (await this.userExists(email)) {
                        throw new InvalidCredentialError();
                    }
                    throw new UserNotFoundError();
                }
                // usuario no encontrado
                case 'auth/user-not-found': {
                    throw new UserNotFoundError();
                }
                // contraseña incorrecta
                case 'auth/wrong-password': {
                    throw new InvalidCredentialError();
                }
                // cualquier otro caso lanza un error genérico
                default: {
                    throw new WrongLoginError();
                }
            }
        }
    }

    /**
     * Comprueba exista una cuenta registrada con un correo específico.
     * @param email correo sobre el que comprobar si existe una centa registrada
     * @private
     * @returns Promise con true si existe; false si no existe.
     */
    private async userExists (email: string): Promise<boolean> {
        try{
            const userRef = collection(this.firestore, 'users');
            const q = query(userRef, where('email', '==', email));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            return false;
        }
    }
    private firestore = inject(Firestore);
    private auth = inject(Auth);

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
