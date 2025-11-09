import {gender, UserModel} from '../../data/UserModel';
import {UserRepository} from './UserRepository';

/* PARA AT
import {Firestore} from '@angular/fire/firestore';
import {inject} from '@angular/core';*/

export class UserDB implements UserRepository {
    //private firestore = inject(Firestore);
    async createUser(user: UserModel) : Promise<UserModel> {
        return {email: "",password:"",nombre:"",apellidos:"",genero:gender.OTHER};
    }
    async validateCredentials(email: string, password: string): Promise<Boolean> {return false;}
    async exists(email: string): Promise<Boolean> {return false;}
}
