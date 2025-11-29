export class MissingPOIListError extends Error {
    constructor() {
        super("No se ha registrado ningún POI todavía. Creando lista vacía...");
    }
}
