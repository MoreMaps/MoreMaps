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

    toJSON() {
        return {
            uid: this.uid,
            email: this.email,
            nombre: this.nombre,
            apellidos: this.apellidos
        };
    }

    static fromJSON(json: any) {
        return new UserModel(json.uid, json.email, json.nombre, json.apellidos);
    }
}
