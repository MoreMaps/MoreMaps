import {UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';

/* PARA AT
import {Firestore} from '@angular/fire/firestore';
import {inject} from '@angular/core';*/

export class UserDB implements UserRepository {
    //private firestore = inject(Firestore);
    async createUser(uid: string, email: string, pwd: string, nombre: string, apellidos: string) : Promise<UserModel> {
        return {uid:"", email: "", nombre:"", apellidos:""};
    }
    async validateCredentials(email: string, password: string): Promise<Boolean> {return false;}
}
