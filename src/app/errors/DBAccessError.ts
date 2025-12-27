export class DBAccessError extends Error {
    constructor() {
        super("Ha ocurrido un error al acceder a la base de datos.");
    }
}
