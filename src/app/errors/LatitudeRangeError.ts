export class LatitudeRangeError extends Error {
    constructor() {
        super("La latitud debe ser un número entre -90 y 90.");
    }
}
