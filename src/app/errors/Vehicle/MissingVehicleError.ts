export class MissingVehicleError extends Error {
    constructor() {
        super("El vehiculo no está registrado.");
    }
}
