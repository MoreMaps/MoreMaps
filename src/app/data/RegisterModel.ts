// TODO: esto no se debería usar?
export class RegisterModel {
    email: string;
    nombre: string;
    apellidos: string;
    pwd: string;

    constructor(email: string, nombre: string, apellidos: string, password: string) {
        this.email = email;
        this.nombre = nombre;
        this.apellidos = apellidos;
        this.pwd = password;
    }
}
