export class VehicleAlreadyExistsError extends Error {
    constructor() {
        super("El vehiculo ya está registrado.");
    }
}
