export class FuelPriceNotFoundError extends Error {
    constructor() {
        super("No se ha podido obtener el precio del combustible.");
    }
}
