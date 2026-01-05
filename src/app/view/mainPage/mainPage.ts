import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {NgOptimizedImage} from '@angular/common';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {LoginDialogComponent} from './login-dialog/login-dialog';
import {RegisterDialogComponent} from './register-dialog/register-dialog.component';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {Auth, authState} from '@angular/fire/auth';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {UserService} from '../../services/User/user.service';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
    selector: 'main-page',
    templateUrl: './mainPage.html',
    imports: [
        MatButton,
        NgOptimizedImage,
        MatDialogModule,
        ThemeToggleComponent,
    ],
    styleUrls: ['./mainPage.css']
})
export class MainPageComponent implements OnInit {
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private auth = inject(Auth);
    private route = inject(ActivatedRoute);
    private userService = inject(UserService);
    private destroyRef = inject(DestroyRef); // Para no dejar suscripciones
    private snackBar = inject(MatSnackBar);

    /**
     * Impide que el usuario acceda a la página de iniciar sesión / crear cuenta cuando la sesión ya está iniciada.
     * */
    ngOnInit() {
        // 1. Detectar el queryParam de borrado de cuenta
        this.route.queryParams.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(params => {
            if (params['accDeletion'] === 'true') {
                this.snackBar.open('Tu cuenta ha sido eliminada correctamente.', 'Cerrar', {
                    duration: 5000,
                    panelClass: ['success-snackbar'], // Asegúrate de tener este estilo en tu CSS global
                    horizontalPosition: 'center',
                    verticalPosition: 'bottom'
                });

                // Limpiar el queryParam de la URL para que no vuelva a salir el snackbar al recargar
                const urlTree = this.router.createUrlTree([], {
                    relativeTo: this.route,
                    queryParams: { accDeletion: null },
                    queryParamsHandling: 'merge'
                });
                void this.router.navigateByUrl(urlTree, { replaceUrl: true });
            }
        });
        // Suscribirse a cambios del authState
        authState(this.auth).pipe(
            takeUntilDestroyed(this.destroyRef) // Suscribirse hasta que el componente se destruya
        ).subscribe(async (user) => {
            if (user) {
                // La sesión está iniciada. Comprobar que sigue existiendo en firestore
                try {
                    await this.userService.getCurrentUser();
                    // si llegamos aquí, va bien
                    void this.router.navigate(['map']);
                } catch (e) {
                    // si llegamos aquí, significa que el usuario en auth está, pero en firebase, no.
                }
            }
        });
    }

    /**
     * Abre el diálogo de registro.
     */
    openRegisterDialog(): void {
        const dialogRef = this.dialog.open(RegisterDialogComponent, {
            width: '60vw',
            maxWidth: '90vw',
            maxHeight: '90vh',
            panelClass: 'custom-dialog-container',
            disableClose: false,
            autoFocus: true,
            restoreFocus: true,
            enterAnimationDuration: '300ms',
            exitAnimationDuration: '200ms',
            // En móvil, ocupar casi toda la pantalla
            ...(window.innerWidth < 768 && {
                width: '95vw',
                maxWidth: '95vw',
                maxHeight: '95vh'
            })
        });

        dialogRef.componentInstance.switchToLogin.subscribe(() => {
            dialogRef.close({ switchDialog: true });
        });

        // Subscribe to dialog close to check if registration was successful
        dialogRef.afterClosed().subscribe(result => {
            if (result?.switchDialog) {
                this.openLoginDialog();
            } else if (result?.success) {
                this.router.navigate(['map']).then();
            }
        });
    }

    /**
     * Abre el diálogo de inicio de sesión
     */
    openLoginDialog(): void {
        const dialogRef = this.dialog.open(LoginDialogComponent, {
            width: '60vw',
            maxWidth: '90vw',
            maxHeight: '90vh',
            panelClass: 'custom-dialog-container',
            disableClose: false,
            autoFocus: true,
            restoreFocus: true,
            enterAnimationDuration: '300ms',
            exitAnimationDuration: '200ms',
            // En móvil, ocupar casi toda la pantalla
            ...(window.innerWidth < 768 && {
                width: '95vw',
                maxWidth: '95vw',
                maxHeight: '95vh'
            })
        });

        dialogRef.componentInstance.switchToRegister.subscribe(() => {
            dialogRef.close({ switchDialog: true });
        });

        // Subscribe to dialog close to check if login was successful
        dialogRef.afterClosed().subscribe(result => {
            if (result?.switchDialog) {
                this.openRegisterDialog();
            } else if (result?.success) {
                this.router.navigate(['map']).then();
            }
        });
    }
}
