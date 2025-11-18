import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {deleteUser, Auth} from "@angular/fire/auth";
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {inject} from '@angular/core';

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
        // Si falla, se atrapa la excepción y no se borra el usuario
        deleteUser(user).catch((error) => {
            console.error('ERROR de Firebase al borrar usuario: ' + error);
            return false;
        });
        return true;
    }

    async validateCredentials(email: string, password: string): Promise<boolean> {return false;}
}
