export class MissingParamsError extends Error {
    constructor() {
        super("Faltan parámetros o son incorrectos.");
    }
}
