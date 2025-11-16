import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {getAuth, deleteUser, Auth} from "@angular/fire/auth";
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';

export class UserDB implements UserRepository {
    private auth: Auth = getAuth();

    async createUser(email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel> {
        return {uid:"", email: "", nombre:"", apellidos:""};
    }
    async deleteUser() : Promise<boolean> {
        // Obtiene el usuario de la sesión; si no hay, no se puede borrar
        const user = this.auth.currentUser;
        if (!user) throw new SessionNotActiveError();

        // Borra al usuario de la BD
        deleteUser(user).then(() => {
            console.log('Usuario borrado con éxito.');
        }).catch((error) => {
            console.error(error);
            return false;
        });
        return true;
    }

    async validateCredentials(email: string, password: string): Promise<boolean> {return false;}
}
