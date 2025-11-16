import {inject, Injectable} from '@angular/core';
import {UserModel} from '../../data/UserModel';
import {USER_REPOSITORY, UserRepository} from './UserRepository';


@Injectable({ providedIn: 'root' })
export class UserService {
    private userDb : UserRepository = inject(USER_REPOSITORY);

    // HU101 Crear usuario
    async signUp(email: string, pwd: string, nombre: string, apellidos: string): Promise<UserModel> {
        return {
            uid: "",
            email: "",
            nombre: "",
            apellidos: "",
        };
    }

    // HU102 Iniciar sesión
    async login(email: string, pwd: string): Promise<boolean> {
        return false;
    }

    // HU105 Cerrar sesión
    async logout(): Promise<boolean> {
        return false;
    }

    // HU105 Cerrar sesión (auxiliar: usuario actual)
    async getCurrentUser(): Promise<UserModel> {
        return {
            uid: "",
            email: "",
            nombre: "",
            apellidos: "",
        };
    }

    // HU106 Eliminar cuenta
    async deleteUser(u: UserModel): Promise<Boolean> {
        return false;
    }
}
