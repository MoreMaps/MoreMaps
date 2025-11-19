export class InvalidCredentialError extends Error {
    constructor() {
        super("El correo o la contraseña introducidos son incorrectos.");
    }
}
