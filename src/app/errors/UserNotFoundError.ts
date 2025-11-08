export class UserNotFoundError extends Error {
    constructor() {
        super("No existe ningún usuario registrado con ese nombre.");
    }
}
