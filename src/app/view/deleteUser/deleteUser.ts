// account-settings.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/User/user.service';

@Component({
    selector: 'deleteUser',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './deleteUser.html',
    styleUrls: ['./deleteUser.css']
})
export class AccountSettingsComponent {
    showModal: boolean = false;

    constructor(
        private userService: UserService,
        private router: Router
    ) {}

    /**
     * Abre el popup de confirmación
     */
    openPopup(): void {
        this.showModal = true;
    }

    /**
     * Cierra el menú de confirmación
     */
    closePopup(): void {
        this.showModal = false;
    }

    /**
     * Confirma la eliminación de la cuenta
     */
    confirmDelete(): void {
        this.userService.deleteUser()
            .then((r) => {
                if (r) console.log('Usuario borrado con éxito.');
                else {
                    console.log('Usuario no borrado');
                    return
                }
                this.router.navigate(['/login']);
            })
            .catch((err) => {
                console.log('ERROR al borrar usuario' + err);
            })
    }
}
