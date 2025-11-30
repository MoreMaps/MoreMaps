export class APIAccessError extends Error {
    constructor() {
        super("No es posible acceder a la API.");
    }
}
