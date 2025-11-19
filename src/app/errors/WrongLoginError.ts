export class WrongLoginError extends Error {
    constructor() {
        super("Se ha producido un error al intentar iniciar sesión.");
    }
}
