import {inject, Injectable} from '@angular/core';
import {UserModel} from '../../data/UserModel';
import {USER_REPOSITORY, UserRepository} from './UserRepository';
import {UserAlreadyExistsError} from '../../errors/User/UserAlreadyExistsError';
import {WrongPasswordFormatError} from '../../errors/User/WrongPasswordFormatError';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {UserNotFoundError} from '../../errors/User/UserNotFoundError';
import {WrongParamsError} from '../../errors/WrongParamsError';
import {MissingParamsError} from '../../errors/MissingParamsError';
import {SessionAlreadyActiveError} from '../../errors/User/SessionAlreadyActiveError';
import {InvalidCredentialError} from '../../errors/User/InvalidCredentialError';

@Injectable({providedIn: 'root'})
export class UserService {
    private userDb: UserRepository = inject(USER_REPOSITORY);

    // HU101 Crear usuario
    /** Crea el usuario si este no existe ya.
     * @throws MissingParamsError si algún parámetro falta.
     * @throws UserAlreadyExistsError si ya existe el usuario.
     * @throws WrongPasswordFormatError si la contraseña no cumple con los criterios mínimos.
     */
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

        // Crea un nuevo usuario
        // TODO: se debería utilizar RegisterModel??
        return await this.userDb.createUser(email, pwd, nombre, apellidos);
    }

    // HU102 Iniciar sesión
    /**
     * Inicia sesión con el correo y la contraseña especificados.
     * @throws WrongParamsError si algún parámetro no está completo.
     * @throws UserNotFoundError si no existe el usuario.
     * @throws SessionAlreadyActiveError si la sesión ya existe.
     * @throws InvalidCredentialError si el email/contraseña son inválidos.
     */
    async login(email: string, pwd: string): Promise<boolean> {
        // Comprueba si hay algún parámetro vacío
        if (!email || !pwd) {
            throw new WrongParamsError('usuario');
        }

        // Comprueba que el usuario existe
        if (!await this.userDb.userExists(email)) {
            throw new UserNotFoundError();
        }

        // Comprueba que la sesión NO esté activa
        if (await this.userDb.sessionActive()) {
            throw new SessionAlreadyActiveError();
        }

        // Intenta iniciar sesión
        if (!await this.userDb.validateCredentials(email, pwd)) {
            throw new InvalidCredentialError();
        }
        return true;
    }


    // HU105 Cerrar sesión
    /**
     * Cierra la sesión actual.
     * @throws SessionNotActiveError si la sesión no está activa
     */
    async logout(): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Cierra sesión
        return await this.userDb.logoutUser();
    }

    // HU106 Eliminar cuenta
    /**
     * Borra al usuario con la sesión activa.
     * @throws UserNotFoundError si el usuario no se encuentra
     * @throws SessionNotActiveError si la sesión no está activa
     */
    async deleteUser(): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el usuario existe
        const curr = await this.userDb.getCurrentUser();
        if (!await this.userDb.userExists(curr.email)) {
            throw new UserNotFoundError();
        }

        // Borramos el perfil de Auth y el documento de 'users'
        // TODO:  en it06 - borrar /items
        return this.userDb.deleteAuthUser();
    }
}
