import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

export function noVowelsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        // Test regex: busca a,e,i,o,u (case insensitive)
        const hasVowels = /[aeiou]/i.test(value);

        // Si tiene vocales, devuelve el error { hasVowels: true }
        return hasVowels ? {hasVowels: true} : null;
    };
}

export function notOnlyWhitespaceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        // Si no hay valor, dejamos que Validators.required se encargue
        if (!control.value) return null;

        const isWhitespace = (control.value || '').trim().length === 0;
        const isValid = !isWhitespace;

        // Si solo tiene espacios, devolvemos el error 'onlyWhitespace'
        return isValid ? null : {onlyWhitespace: true};
    };
}
