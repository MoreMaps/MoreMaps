export class POIAlreadyExistsError extends Error {
    constructor() {
        super("El punto de interés especificado ya está registrado.");
    }
}
