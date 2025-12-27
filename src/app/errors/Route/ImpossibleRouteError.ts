export class ImpossibleRouteError extends Error {
    constructor() {
        super("No se han encontrado rutas entre los dos puntos indicados. Prueba con otros.");
    }
}
