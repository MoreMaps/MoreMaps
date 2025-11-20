export class UserModel {
    uid: string;
    email: string;
    nombre: string;
    apellidos: string;

    constructor(uid: string, email: string, nombre: string, apellidos: string) {
        this.uid = uid;
        this.email = email;
        this.nombre = nombre;
        this.apellidos = apellidos;
    }
}
