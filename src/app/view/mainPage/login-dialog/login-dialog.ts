import {Component, EventEmitter, inject, Output} from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {UserService} from '../../../services/User/user.service';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {USER_REPOSITORY} from '../../../services/User/UserRepository';
import {UserDB} from '../../../services/User/UserDB';

@Component({
    selector: 'app-login-dialog',
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule
    ],
    providers: [UserService, {provide: USER_REPOSITORY, useClass: UserDB}],
  templateUrl: './login-dialog.html',
})
export class LoginDialogComponent {
    @Output() switchToRegister = new EventEmitter<void>();
    loginForm: FormGroup;
    hidePassword = true;
    loading = false;
    errorMessage = '';
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<LoginDialogComponent>);
    private userService = inject(UserService);

    constructor() {
        this.loginForm = this.fb.nonNullable.group({
                email: ['', [Validators.required, Validators.email]],
                password: ['', [Validators.required, Validators.minLength(8)]]
            });
    }

    async onSubmit(): Promise<void> {
        if (this.loginForm.valid) {
            this.loading = true;
            this.errorMessage = '';

            const loginData = {
                email: this.loginForm.value.email,
                pwd: this.loginForm.value.password
            };

            try {
                // Iniciar sesión en Firebase
                await this.userService.login(loginData.email, loginData.pwd);
                // Si se llega hasta aquí, se ha iniciado sesión correctamente.
                this.loading = false;
                // Cerrar diálogo y devolver success
                this.dialogRef.close({success: true});
            } catch (error: any) {
                this.errorMessage = error.message;
            }
            this.loading = false;
        }
    }

    onSwitchToRegister() {
        this.switchToRegister.emit();
    }

    close(): void {
        this.dialogRef.close({success: false});
    }

}
