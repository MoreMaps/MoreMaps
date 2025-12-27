export class SessionAlreadyActiveError extends Error {
    constructor() {
        super("La sesión ya está activa.");
    }
}
