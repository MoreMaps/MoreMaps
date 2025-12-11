export class WrongRouteParamsError extends Error {
    constructor() {
        super("Los parámetros de la petición de ruta no están completos.");
    }
}
