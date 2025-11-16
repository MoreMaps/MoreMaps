import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';
import {Firestore} from '@angular/fire/firestore';
import {inject} from '@angular/core';

export class UserDB implements UserRepository {
    private firestore = inject(Firestore);
    async createUser(email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel> {
        return {uid:"", email: "", nombre:"", apellidos:""};
    }
    async deleteUser(u: UserModel) : Promise<boolean> {
        return false;
    }
    async validateCredentials(email: string, password: string): Promise<boolean> {return false;}
}
