import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {Auth} from "@angular/fire/auth";
import {inject} from '@angular/core';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {UserNotFoundError} from '../../errors/UserNotFoundError';

export class UserDB implements UserRepository {
    private auth: Auth = inject(Auth)

    async createUser(email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel> {
        return {uid:"", email: "", nombre:"", apellidos:""};
    }

    async validateCredentials(email: string, password: string): Promise<boolean> {return false;}

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
