export class RouteAlreadyExistsError extends Error {
    constructor() {
        super("Esta ruta ya está registrada.");
    }
}
