export class WrongPasswordFormatError extends Error {
    constructor() {
        super("La contraseña no sigue el formato correcto. Debe tener como mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.");
    }
}
