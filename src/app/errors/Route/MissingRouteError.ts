export class MissingRouteError extends Error {
    constructor() {
        super("No se ha encontrado la ruta.");
    }
}
