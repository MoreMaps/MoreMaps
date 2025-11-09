import {inject, Injectable} from '@angular/core';
import {gender, UserModel} from '../../data/UserModel';
import {USER_REPOSITORY, UserRepository} from './UserRepository';


@Injectable({ providedIn: 'root' })
export class UserService {
    private userDb : UserRepository = inject(USER_REPOSITORY);

    // HU101 Crear usuario
    async signUp(u: UserModel): Promise<UserModel> {
        return {
            email: "",
            nombre: "",
            apellidos: "",
            genero: gender.OTHER
        };
    }

    // HU102 Iniciar sesión
    async login(u: UserModel): Promise<boolean> {
        return false;
    }

    // HU105 Cerrar sesión
    async logout(): Promise<boolean> {
        return false;
    }

    // HU105 Cerrar sesión (auxiliar: usuario actual)
    async currentUser(): Promise<UserModel> {
        return {
            email: "",
            nombre: "",
            apellidos: "",
            genero: gender.OTHER
        };
    }

    // Función auxiliar: el usuario existe?
    async userExists(u: UserModel): Promise<boolean> {
        return false;
    }

}
