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
            if (error.code === 'auth/invalid-credential') {
                if (await this.userExists(email)) throw new InvalidCredentialError();
                throw new UserNotFoundError();
            }
            if (error.code === 'auth/user-not-found') {
                throw new UserNotFoundError();
            }
            if (error.code === 'auth/wrong-password') {
                throw new InvalidCredentialError();
            }
            throw new WrongLoginError();

        }
    }

    private async userExists (email: string): Promise<boolean> {
        try{
            const userRef = collection(this.firestore, 'users');
            const q = query(userRef, where('email', '==', email));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;

        } catch (error) {
            console.error('Error checking user existence: ', error);
            return false;
        }
    }
}
