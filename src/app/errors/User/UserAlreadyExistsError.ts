export class UserAlreadyExistsError extends Error {
    constructor() {
        super("Este email pertenece a un usuario ya registrado. Inicia sesión.");
    }
}
