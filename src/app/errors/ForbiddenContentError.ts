export class ForbiddenContentError extends Error {
    constructor() {
        super("Estás intentando acceder a contenido que no es tuyo.");
    }
}
