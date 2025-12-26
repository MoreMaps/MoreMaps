import {Component, EventEmitter, inject, Output} from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {UserService} from '../../../services/User/user.service';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {USER_REPOSITORY} from '../../../services/User/UserRepository';
import {UserDB} from '../../../services/User/UserDB';
import {Auth, reauthenticateWithCredential, EmailAuthProvider} from '@angular/fire/auth';

export interface LoginDialogData {
    email?: string;
    isReauth?: boolean;
}

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
    private auth = inject(Auth);
    public data = inject<LoginDialogData>(MAT_DIALOG_DATA, {optional:true});

    constructor() {
        this.loginForm = this.fb.nonNullable.group({
                email: ['', [Validators.required, Validators.email]],
                password: ['', [Validators.required, Validators.minLength(8)]]
            })

        // en el caso de reAuth
        if (this.data?.email && this.data?.isReauth) {
            this.loginForm.controls['email'].setValue(this.data.email);
            this.loginForm.controls['email'].disable(); // Deshabilita la edición
        }
    }

    async onSubmit(): Promise<void> {
        if (this.loginForm.valid) {
            this.loading = true;
            this.errorMessage = '';

            // Usamos getRawValue() para incluir el email aunque esté deshabilitado
            const formValue = this.loginForm.getRawValue();

            const loginData = {
                email: formValue.email,
                pwd: formValue.password,
            };

            try {
                // Autenticar en Firebase.
                if (this.data?.isReauth) {
                    const user = this.auth.currentUser;
                    const credential = EmailAuthProvider.credential(
                        loginData.email,
                        loginData.pwd,
                    )
                    await reauthenticateWithCredential(user!, credential);
                } else {
                    await this.userService.login(loginData.email, loginData.pwd);
                }
                // Si se llega hasta aquí, se ha autenticado correctamente.
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
