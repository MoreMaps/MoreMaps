export class DescriptionLengthError extends Error {
    constructor() {
        super("La longitud máxima permitida es de 150 caracteres.");
    }
}
