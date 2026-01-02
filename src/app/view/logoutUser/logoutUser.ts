import { Component } from '@angular/core';
import {UserService} from '../../services/User/user.service';
import {Router} from '@angular/router';

@Component({
  selector: 'logoutUser',
  imports: [],
  templateUrl: './logoutUser.html',
  styleUrl: './logoutUser.css',
})
export class LogoutUser {
    showUserMenu = false;
    showLogoutConfirmation = false;

    constructor(private userService: UserService, private router: Router) {}

    toggleUserMenu(): void {
        this.showUserMenu = !this.showUserMenu;
        if (this.showUserMenu) {
            this.showLogoutConfirmation = false;
        }
    }

    openPopup(): void {
        this.showLogoutConfirmation = true;
        this.showUserMenu = false;
    }

    closePopup(): void {
        this.showLogoutConfirmation = false;
    }

    confirmLogout(): void {
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
                console.log('ERROR al borrar usuario' + err);
            })
        this.showLogoutConfirmation = false;
    }

    // Por ahora, va a eliminar cuenta
    onAccountSettings(): void {
        this.router.navigate(['/deleteUser']);
    }
}
