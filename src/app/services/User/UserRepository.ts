import {UserModel} from '../../data/UserModel';
import {InjectionToken} from '@angular/core';

export interface UserRepository{
    createUser(user: UserModel) : Promise<UserModel>
    validateCredentials(email: string, password: string): Promise<Boolean>
    exists(email: string): Promise<Boolean>
}

export const USER_REPOSITORY = new InjectionToken<UserRepository>('UserRepository');
