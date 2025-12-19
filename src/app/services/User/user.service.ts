import {inject, Injectable, signal} from '@angular/core';
import {UserModel} from '../../data/UserModel';
import {USER_REPOSITORY, UserRepository} from './UserRepository';
import {UserAlreadyExistsError} from '../../errors/UserAlreadyExistsError';
import {WrongPasswordFormatError} from '../../errors/WrongPasswordFormatError';
import {WrongLoginError} from '../../errors/WrongLoginError';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {UserNotFoundError} from '../../errors/UserNotFoundError';
import {WrongParamsError} from '../../errors/WrongParamsError';

import {MissingParamsError} from '../../errors/MissingParamsError';

@Injectable({providedIn: 'root'})
export class UserService {
    private userDb: UserRepository = inject(USER_REPOSITORY);

    // HU101 Crear usuario
    /** Crea el usuario si este no existe ya.
     * @throws MissingParamsError si algún parámetro falta.
     * @throws UserAlreadyExistsError si ya existe el usuario.
     * @throws WrongPasswordFormatError si la contraseña no cumple con los criterios mínimos.
     * */
    async signUp(email: string, pwd: string, nombre: string, apellidos: string): Promise<UserModel> {
        // Comprobar si hay algún parámetro vacío
        if (!email || !pwd || !nombre || !apellidos) {
            throw new MissingParamsError();
        }

        // Comprobar si las credenciales son válidas
        if (!await this.userDb.passwordValid(pwd)) {
            throw new WrongPasswordFormatError();
        }

        // Comprobar si el usuario existe
        if (await this.userDb.userExists(email)) {
            throw new UserAlreadyExistsError();
        }

        // Si no existe, intenta crearlo
        return await this.userDb.createUser(email, pwd, nombre, apellidos);
    }

    // HU102 Iniciar sesión
    /**
     * Inicia sesión con el correo y la contraseña especificados.
     * @throws WrongParamsError si algún parámetro no está completo.
     * @throws WrongLoginError si no se puede iniciar sesión.
     */
    async login(email: string, pwd: string): Promise<boolean> {
        if (!email || !pwd) {
            throw new WrongParamsError('usuario');
        }
        try {
            await this.userDb.validateCredentials(email, pwd);
            return true;
        } catch (error: any) {
            switch (error.code) {
                // El usuario no existe
                case 'auth/invalid-credential':
                    throw new UserNotFoundError();
                default:
                    // Error desconocido de login
                    throw new WrongLoginError();
            }
        }
    }


    // HU105 Cerrar sesión
    /**
     * Cierra la sesión actual.
     * @throws UserNotFoundError si el usuario no se encuentra
     * @throws SessionNotActiveError si la sesión no está activa
     */
    async logout(): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }
        try {
            return await this.userDb.logoutUser();
        } catch (error: any) {
            // Error de Firebase
            switch (error.code) {
                // El usuario no existe
                case 'auth/invalid-credential':
                    throw new UserNotFoundError();
                default:
                    // Error desconocido
                    throw new Error('Error desconocido: ' + error);
            }
        }
    }

    // HU106 Eliminar cuenta
    async deleteUser(): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        try {
            // 1. Borramos el perfil de Auth y el documento /users
            return this.userDb.deleteAuthUser();
            // TODO en it06 - borrar /items
        } catch (error: any) {
            switch (error.code) {
                case 'auth/requires-recent-login':
                    // El usuario necesita re-autenticarse antes de borrar
                    throw new SessionNotActiveError();
                case 'auth/user-not-found':
                case 'auth/invalid-credential':
                    // El usuario ya no existe en Auth
                    throw new UserNotFoundError();
                default:
                    // Error desconocido
                    throw new Error('Error desconocido: ' + error);
            }
        }
    }
}
