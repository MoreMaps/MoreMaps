import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {UserService} from '../../../services/User/user.service';
import {USER_REPOSITORY} from '../../../services/User/UserRepository';
import {UserDB} from '../../../services/User/UserDB';

interface UserData {
    fullName: string;
    email: string;
    profileImage: string;
}

@Component({
    selector: 'app-profile-menu',
    templateUrl: './profile-menu.component.html',
    styleUrl: './profile-menu.component.css',
    providers: [UserService, {provide: USER_REPOSITORY, useClass: UserDB}],
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

    // Navigate to delete account page (settings)
    goToSettings(): void {
        this.dialogRef.close();
        void this.router.navigate(['/preferences']);
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
                if (!r) return;
                this.dialogRef.close();
                void this.router.navigate(['']);
            });
        this.showLogoutConfirmation.set(false);
    }
}
