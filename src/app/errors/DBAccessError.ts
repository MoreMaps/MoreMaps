export class SessionNotActiveError extends Error {
    constructor() {
        super("No es posible acceder a la base de datos.");
    }
}
