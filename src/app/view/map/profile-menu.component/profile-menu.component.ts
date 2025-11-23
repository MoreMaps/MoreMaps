import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../../services/User/user.service';
import { USER_REPOSITORY } from '../../../services/User/UserRepository';
import { UserDB } from '../../../services/User/UserDB';

interface UserData {
    fullName: string;
    email: string;
    profileImage: string;
}

@Component({
    selector: 'app-profile-menu',
    templateUrl: './profile-menu.component.html',
    styleUrl: './profile-menu.component.css',
    providers: [UserService, { provide: USER_REPOSITORY, useClass: UserDB }],
    imports: [CommonModule, MatIconModule]
})
export class ProfileMenuComponent {
    private dialogRef = inject(MatDialogRef<ProfileMenuComponent>);
    private router = inject(Router);
    private userService = inject(UserService);
    private data = inject<UserData>(MAT_DIALOG_DATA);

    // Signals for reactive state
    fullName = signal(this.data.fullName);
    email = signal(this.data.email);
    profileImage = signal(this.data.profileImage);
    showLogoutConfirmation = signal(false);

    // Close the menu
    closeMenu(): void {
        this.dialogRef.close();
    }

    // Navigate to delete account page (settings)
    goToSettings(): void {
        this.dialogRef.close();
        void this.router.navigate(['/deleteUser']);
    }

    // Open logout confirmation popup
    openLogoutPopup(): void {
        this.showLogoutConfirmation.set(true);
    }

    // Close logout confirmation popup
    closeLogoutPopup(): void {
        this.showLogoutConfirmation.set(false);
    }

    // Confirm logout
    confirmLogout(): void {
        this.userService.logout()
            .then((r) => {
                if (r) {
                    console.log('Usuario cerrado sesión con éxito.');
                } else {
                    console.log('Error al cerrar sesión');
                    return;
                }
                this.dialogRef.close();
                void this.router.navigate(['/login']);
            })
            .catch((err) => {
                console.log('ERROR al cerrar sesión: ' + err);
            });
        this.showLogoutConfirmation.set(false);
    }
}
