import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/User/user.service';
import {USER_REPOSITORY} from '../../services/User/UserRepository';
import {UserDB} from '../../services/User/UserDB';

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
                this.router.navigate(['/login']);
            })
            .catch((err) => {
                console.log('ERROR al borrar usuario' + err);
            })
        this.showModal = false;
    }
}
