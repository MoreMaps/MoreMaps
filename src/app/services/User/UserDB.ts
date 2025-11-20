import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {deleteUser, Auth} from "@angular/fire/auth";
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {inject} from '@angular/core';
import {UserNotFoundError} from '../../errors/UserNotFoundError';

export class UserDB implements UserRepository {
    private auth: Auth = inject(Auth)

    async createUser(email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel> {
        return {uid:"", email: "", nombre:"", apellidos:""};
    }
    async deleteUser() : Promise<boolean> {
        // Obtiene el usuario de la sesión; si no hay, no se puede borrar
        const user = this.auth.currentUser;
        if (!user) throw new SessionNotActiveError();

        // Borra al usuario de la BD, y cierra la sesión
        deleteUser(user).catch((error) => {

            // El usuario ya no existe (eliminar en pestañas distintas)
            if (error.code == 'auth/invalid-credential') {
                throw new UserNotFoundError();
            }

            // Error cualquiera
            console.error('ERROR de Firebase al borrar usuario: ' + error);
            return false;
        });
        return true;
    }

    async validateCredentials(email: string, password: string): Promise<boolean> {return false;}
}
