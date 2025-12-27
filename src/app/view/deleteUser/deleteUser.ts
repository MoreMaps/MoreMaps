import {Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/User/user.service';
import {USER_REPOSITORY} from '../../services/User/UserRepository';
import {UserDB} from '../../services/User/UserDB';
import {ReauthNecessaryError} from '../../errors/User/ReauthNecessaryError';
import {LoginDialogComponent} from '../mainPage/login-dialog/login-dialog';
import {MatDialog} from '@angular/material/dialog';
import {Auth} from '@angular/fire/auth';

@Component({
    selector: 'deleteUser',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './deleteUser.html',
    styleUrls: ['./deleteUser.css'],
    providers: [UserService, {provide: USER_REPOSITORY, useClass: UserDB}]
})
export class AccountSettingsComponent {
    showModal: boolean = false;
    private dialog = inject(MatDialog);
    private auth = inject(Auth);

    constructor(
        private userService: UserService,
        private router: Router
    ) {}

    openPopup(): void {
        this.showModal = true;
    }

    closePopup(): void {
        this.showModal = false;
    }

    confirmDelete(): void {
        this.userService.deleteUser()
            .then((r) => {
                if (r) console.log('Usuario borrado con éxito.');
                else {
                    console.log('Usuario no borrado');
                    return
                }
                this.router.navigate(['']);
            })
            .catch((err) => {
                if (err instanceof ReauthNecessaryError) {
                    if   (!this.auth.currentUser) this.router.navigate(['']);
                    else this.openLoginDialog();
                }
                console.log('ERROR al borrar usuario' + err);
            })
        this.showModal = false;
    }

    private openLoginDialog(): void {
        const dialogRef = this.dialog.open(LoginDialogComponent, {
            data: {
              email: this.auth.currentUser?.email,
              isReauth: true
            },
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

        // Subscribe to dialog close to check if login was successful
        dialogRef.afterClosed().subscribe(result => {
            if (result?.success) {
                this.confirmDelete();
            }
        });
    }
}
