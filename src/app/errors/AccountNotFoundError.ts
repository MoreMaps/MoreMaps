export class AccountNotFoundError extends Error {
    constructor() {
        super("La cuenta solicitada no existe.");
    }
}
