import {inject, Injectable} from '@angular/core';
import {UserModel} from '../../data/UserModel';
import {USER_REPOSITORY, UserRepository} from './UserRepository';
import {UserAlreadyExistsError} from '../../errors/UserAlreadyExistsError';
import {WrongPasswordFormatError} from '../../errors/WrongPasswordFormatError';
import {WrongLoginError} from '../../errors/WrongLoginError';

@Injectable({ providedIn: 'root' })
export class UserService {
    private userDb : UserRepository = inject(USER_REPOSITORY);

    // HU101 Crear usuario
    async signUp(email: string, pwd: string, nombre: string, apellidos: string): Promise<UserModel> {
        try {
            return await this.userDb.createUser(email, pwd, nombre, apellidos);
        }
        catch (error: any) {
            if (error && typeof error.code === 'string') {
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        throw new UserAlreadyExistsError();
                    case 'auth/invalid-password':
                        throw new WrongPasswordFormatError();
                    case 'auth/password-does-not-meet-requirements':
                        throw new WrongPasswordFormatError();
                    default:
                        throw new Error('Error desconocido de Firebase: ' + error.code);
                }
            } else {
                throw Error('Error desconocido: ' + error.code);
            }
        }
    }

    // HU102 Iniciar sesión
    async login(email: string, pwd: string): Promise<boolean> {
        const res = await this.userDb.validateCredentials(email, pwd);
        // error si no se ha podido iniciar sesión
        if( !res ){
            throw new WrongLoginError();
        }
        return res;
    }


    // HU105 Cerrar sesión
    async logout(): Promise<boolean> {
        return this.userDb.logoutUser();
    }

    // HU106 Eliminar cuenta
    async deleteUser(): Promise<boolean> {
        return this.userDb.deleteUser();
    }
}
