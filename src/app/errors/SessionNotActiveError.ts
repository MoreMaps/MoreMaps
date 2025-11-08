export class SessionNotActiveError extends Error {
    constructor() {
        super("La sesión no está activa.");
    }
}
