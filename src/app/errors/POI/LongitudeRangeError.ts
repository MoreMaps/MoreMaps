export class LongitudeRangeError extends Error {
    constructor() {
        super("La longitud debe ser un número entre -180 y 180.");
    }
}
