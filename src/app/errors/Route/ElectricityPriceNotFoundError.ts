export class ElectricityPriceNotFoundError extends Error {
    constructor() {
        super("No se ha podido obtener el precio de la electricidad.");
    }
}
