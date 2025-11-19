import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {inject, Injectable} from '@angular/core';
import {Auth, signInWithEmailAndPassword} from '@angular/fire/auth';
import {WrongLoginError} from '../../errors/WrongLoginError';
import {InvalidCredentialError} from '../../errors/InvalidCredentialError';

@Injectable({
    providedIn: 'root'
})
export class UserDB implements UserRepository {
    private auth = inject(Auth);

    async createUser(email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel> {
        return {uid:"", email: "", nombre:"", apellidos:""};
    }

    async validateCredentials(email: string, password: string): Promise<boolean> {
        // Intento de inicio de sesión
        // todo: eliminar logs
        try {
            // Inicio de sesión en Firebase
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            console.log(userCredential);

            // Devuelve true si no ha habido errores
            return true;
        } catch (error: any) {
            console.log(error);
            if (error.message == 'auth/invalid-credential') {
                throw new InvalidCredentialError();
            }
            throw new WrongLoginError();

        }
    }
}
