export class InvalidDataError extends Error {
    constructor() {
        super("Los datos no son correctos.");
    }
}
