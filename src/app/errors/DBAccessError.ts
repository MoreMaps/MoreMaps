export class DBAccessError extends Error {
    constructor(msg: string) {
        super("Ha ocurrido un error al acceder a la base de datos: " + msg);
    }
}
