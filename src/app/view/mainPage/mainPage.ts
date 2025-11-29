import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {NgOptimizedImage} from '@angular/common';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {LoginDialogComponent} from './login-dialog/login-dialog';
import {RegisterDialogComponent} from './register-dialog/register-dialog.component';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';

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
export class MainPageComponent {
    private router = inject(Router);
    private dialog = inject(MatDialog);

    /**
     * Abre el diálogo de registro.
     */
    openRegisterDialog(): void {
        console.log('Opening register dialog. Current URL before opening:', this.router.url);
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
            console.log('Register dialog closed with result:', result);
            if (result?.switchDialog) {
                this.openLoginDialog();
            } else if (result?.success) {
                console.log('Navigation to map triggered from register');
                console.log('Current URL:', this.router.url);
                this.router.navigate(['map']).then(success => {
                    console.log('Navigation result from register:', success);
                    if (success) {
                        console.log('Successfully navigated to:', this.router.url);
                    }
                }).catch(err => {
                    console.error('Navigation error from register:', err);
                });
            } else {
                console.log('Register dialog closed without success or switch');
            }
        });
    }

    /**
     * Abre el diálogo de inicio de sesión
     */
    openLoginDialog(): void {
        console.log('Opening login dialog. Current URL before opening:', this.router.url);
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
            console.log('Login dialog closed with result:', result);
            if (result?.switchDialog) {
                this.openRegisterDialog();
            } else if (result?.success) {
                console.log('Navigation to map triggered from login');
                console.log('Current URL:', this.router.url);
                this.router.navigate(['map']).then(success => {
                    console.log('Navigation result from login:', success);
                    if (success) {
                        console.log('Successfully navigated to:', this.router.url);
                    }
                }).catch(err => {
                    console.error('Navigation error from login:', err);
                });
            } else {
                console.log('Login dialog closed without success or switch');
            }
        });
    }
}
