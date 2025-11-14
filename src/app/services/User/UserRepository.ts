import {UserModel} from '../../data/UserModel';
import {InjectionToken} from '@angular/core';

export const USER_REPOSITORY = new InjectionToken<UserRepository>('UserRepository');

export interface UserRepository{
    createUser(uid: string, email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel>
    validateCredentials(email: string, password: string): Promise<Boolean>
}
