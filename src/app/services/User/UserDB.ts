import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {inject, Injectable} from '@angular/core';
import {Auth, signInWithEmailAndPassword} from '@angular/fire/auth';
import {WrongLoginError} from '../../errors/WrongLoginError';
import {InvalidCredentialError} from '../../errors/InvalidCredentialError';
import {UserNotFoundError} from '../../errors/UserNotFoundError';
import {collection, Firestore, query, where, getDocs} from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})
export class UserDB implements UserRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    async createUser(email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel> {
        return {uid:"", email: "", nombre:"", apellidos:""};
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
}
