import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {NgOptimizedImage} from '@angular/common';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {RegisterDialogComponent} from './register-dialog/register-dialog.component';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
    selector: 'main-page',
    templateUrl: './mainPage.html',
    imports: [
        MatButton,
        NgOptimizedImage,
        MatDialogModule,
    ],
    styleUrls: ['./mainPage.css']
})
export class MainPageComponent {

    constructor(private router: Router) {
    }

    private dialog = inject(MatDialog);
    private snackbar = inject(MatSnackBar);

    /**
     * Abre el diálogo de iniciar sesión.
     * No pertenece a esta historia, pero quise comprobar de primeras
     * que el botón del diálogo de registro para llevar a esta función
     * funcionaba correctamente.
     */

    openLoginDialog(): void {
        this.snackbar.open('El enlace funciona correctamente', 'Cerrar', {
            duration: 3000,             // tiempo en milisegundos que dura el snackbar
            horizontalPosition: 'right', // 'start' | 'center' | 'end' | 'left' | 'right'
            verticalPosition: 'bottom',  // 'top' | 'bottom'
            panelClass: ['success-snackbar'] // opcional, para estilos personalizados
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
           dialogRef.close();
           this.openLoginDialog();
        });
    }
}
