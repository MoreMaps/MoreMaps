import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(Auth);
    const router = inject(Router);

    // authState es un Observable. Angular esperará a que emita un valor.
    return authState(auth).pipe(
        take(1), // Tomamos solo el primer valor (la comprobación inicial) y cerramos
        map(user => {
            if (user) {
                // Si hay usuario, permitimos la carga de la página
                return true;
            } else {
                // Si no hay usuario, redirigimos al login (o landing)
                return router.createUrlTree(['']); // nuestro landing es ruta ''
            }
        })
    );
};
