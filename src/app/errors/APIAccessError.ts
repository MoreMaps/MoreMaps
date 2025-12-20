export class APIAccessError extends Error {
    constructor() {
        super("Ha habido un error al acceder a la API.");
    }
}
