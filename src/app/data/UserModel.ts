export interface UserModel {
    email: string,
    password?: string,
    nombre: string,
    apellidos: string,
    genero: gender;
}

// Constructor
export function createUser(email: string, password: string, nombre: string, apellidos: string, genero: gender): UserModel {
    return {
        email: email,
        password: password,
        nombre: nombre,
        apellidos: apellidos,
        genero: genero,
    }
}

export enum gender {
    MALE = "Masculino", FEMALE = "Femenino", OTHER = "Otro"
}
