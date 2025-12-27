export class WrongParamsError extends Error {
    constructor(tipo: string) {
        super(`Faltan datos de ${tipo}.`);
    }
}
