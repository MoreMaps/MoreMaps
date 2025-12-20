export class MissingPOIError extends Error {
    constructor() {
        super("El POI no está registrado");
    }
}
