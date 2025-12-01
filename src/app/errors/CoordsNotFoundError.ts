export class CoordsNotFoundError extends Error {
    constructor(lat: number, lon: number) {
        super(`No se ha encontrado ningún punto de interés con las coordenadas (${lat}, ${lon})`);
    }
}
