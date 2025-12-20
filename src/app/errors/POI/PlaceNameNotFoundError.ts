export class PlaceNameNotFoundError extends Error {
    constructor(toponimo: string) {
        super("No se ha encontrado ningún punto de interés con el topónimo " + toponimo);
    }
}
