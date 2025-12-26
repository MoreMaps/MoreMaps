export class ReauthNecessaryError extends Error {
    constructor() {
        super("Se debe volver a iniciar sesión.");
    }
}
