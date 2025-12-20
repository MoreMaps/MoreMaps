import {UserModel} from '../../data/UserModel';
import {InjectionToken} from '@angular/core';

export const USER_REPOSITORY = new InjectionToken<UserRepository>('UserRepository');

export interface UserRepository{
    createUser(email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel>
    deleteAuthUser() : Promise<boolean>
    validateCredentials(email: string, password: string): Promise<boolean>
    logoutUser(): Promise<boolean>;
    userExists(email: string): Promise<boolean>;
    sessionActive(): Promise<boolean>;
    passwordValid(password: string): Promise<boolean>;
    getCurrentUser(): Promise<UserModel>;
}
