import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {NgOptimizedImage} from '@angular/common';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {LoginDialogComponent} from './login-dialog/login-dialog';
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

  constructor(private router: Router) {}
    private dialog = inject(MatDialog);
    private snackbar = inject(MatSnackBar);
  
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
          dialogRef.close();
          this.openRegisterDialog();
      });
  }
}
