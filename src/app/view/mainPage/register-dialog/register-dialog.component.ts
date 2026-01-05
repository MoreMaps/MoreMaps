import {Component, EventEmitter, inject, Output} from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators
} from '@angular/forms';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {UserService} from '../../../services/User/user.service';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {RegisterModel} from '../../../data/RegisterModel';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {USER_REPOSITORY} from '../../../services/User/UserRepository';
import {UserDB} from '../../../services/User/UserDB';

@Component({
    selector: 'app-register-dialog',
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
    templateUrl: './register-dialog.component.html',
})
export class RegisterDialogComponent {
    @Output() switchToLogin = new EventEmitter<void>();
    registerForm: FormGroup;
    hidePassword = true;
    hideConfirmPassword = true;
    loading = false;
    errorMessage = '';
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<RegisterDialogComponent>);
    private userService = inject(UserService);

    constructor() {
        this.registerForm = this.fb.nonNullable.group({
                firstName: ['', [Validators.required, Validators.minLength(3)]],
                lastName: ['', [Validators.required, Validators.minLength(3)]],
                email: ['', [Validators.required, Validators.email]],
                confirmEmail: ['', [Validators.required, Validators.email]],
                password: ['', [Validators.required,
                    Validators.minLength(8),
                    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]).+$/)]],
                confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
            },
            {
                validators: [
                    (c) => this.passwordMatchValidator(c),
                    (c) => this.emailMatchValidator(c)
                ]
            });

        // Add value change listeners to trigger re-validation
        this.registerForm.get('email')?.valueChanges.subscribe(() => {
            this.registerForm.get('confirmEmail')?.updateValueAndValidity({onlySelf: true});
        });

        this.registerForm.get('password')?.valueChanges.subscribe(() => {
            this.registerForm.get('confirmPassword')?.updateValueAndValidity({onlySelf: true});
        });
    }

    emailMatchValidator(control: AbstractControl): ValidationErrors | null {
        const form = control as FormGroup; // cast
        const email = form.get('email');
        const confirmEmail = form.get('confirmEmail');

        if (email && confirmEmail && email.value !== confirmEmail.value) {
            confirmEmail.setErrors({emailMismatch: true});
            return {emailMismatch: true};
        }
        return null;
    }

    passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
        const form = control as FormGroup; // cast
        const password = form.get('password');
        const confirmPassword = form.get('confirmPassword');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setErrors({passwordMismatch: true});
            return {passwordMismatch: true};
        }
        return null;
    }

    async onSubmit(): Promise<void> {
        if (this.registerForm.valid) {
            this.errorMessage = '';
            this.loading = true;

            const registerData = new RegisterModel(
                this.registerForm.value.email,
                this.registerForm.value.firstName,
                this.registerForm.value.lastName,
                this.registerForm.value.password,
            );

            const userModel = await this.userService.signUp(registerData);

            // Registrar usuario en Firebase
            try {
                this.loading = false;
                this.dialogRef.close();
                if (userModel && userModel.uid !== '') {
                    // Cerrar diálogo y devolver success
                    this.dialogRef.close({success: true});
                } else {
                }
            } catch (error: any) {
                this.loading = false;
                this.errorMessage = error.message;
            }
        }
    }

    onSwitchToLogin() {
        this.switchToLogin.emit();
    }

    close(): void {
        this.dialogRef.close({success: false});
    }
}
