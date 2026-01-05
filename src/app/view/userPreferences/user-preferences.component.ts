import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatRadioModule} from '@angular/material/radio';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatIconModule} from '@angular/material/icon';
import {MatIconButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatInput} from '@angular/material/input';
import {Router} from '@angular/router';
import {PreferenceService} from '../../services/Preferences/preference.service';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {PreferenceModel} from '../../data/PreferenceModel';
import {mapaPreferencia, mapaTransporte, PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {
    SavedItemSelector,
    SavedSelectorData
} from '../../services/saved-items/saved-item-selector-dialog/savedSelectorData';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {NavbarComponent} from '../navbar/navbar.component';
import {UserService} from '../../services/User/user.service';
import {Auth} from '@angular/fire/auth';
import {LoginDialogComponent} from '../mainPage/login-dialog/login-dialog';
import {ReauthNecessaryError} from '../../errors/User/ReauthNecessaryError';
import {MatProgressSpinner} from '@angular/material/progress-spinner';

@Component({
    selector: 'app-user-preferences',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
        MatIconModule,
        MatIconButton,
        MatInput,
        ThemeToggleComponent,
        ProfileButtonComponent,
        NavbarComponent,
        MatProgressSpinner
    ],
    templateUrl: './user-preferences.component.html',
    styleUrls: ['./user-preferences.component.scss']
})
export class UserPreferencesComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private preferenceService = inject(PreferenceService);
    private vehicleService = inject(VehicleService);
    private userService = inject(UserService);
    private auth = inject(Auth);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);

    prefForm: FormGroup;
    loading = false;

    // Almacena el estado inicial para comprobar cambios
    private initialValues: any = null;

    routesOptions = Object.entries(mapaPreferencia).map(([key, label]) => ({
        value: key as PREFERENCIA,
        label: label.charAt(0).toUpperCase() + label.slice(1)
    }));

    transportOptions = Object.entries(mapaTransporte).map(([key, label]) => ({
        value: key as TIPO_TRANSPORTE,
        label: label.charAt(0).toUpperCase() + label.slice(1)
    }));

    // Variables de borrar cuenta
    showDeleteModal = false;
    deleteCountdown = 5;
    private deleteTimer: any;

    selectedVehicleAlias = signal<string>('');

    constructor() {
        this.prefForm = this.fb.group({
            tipoRuta: [null],
            tipoTransporte: [null],
            matricula: [null],
            checkTodo: [true],
            costeCombustible: [true],
            costeCalorias: [true],
        });
    }

    async ngOnInit() {
        await this.loadPreferences();

        this.prefForm.get('tipoTransporte')?.valueChanges.subscribe(val => {
            this.updateMatriculaValidation(val);
        });

        this.prefForm.get('checkTodo')?.valueChanges.subscribe(checked => {
            if (checked) {
                this.prefForm.patchValue({costeCombustible: true, costeCalorias: true}, {emitEvent: false});
            } else {
                const current = this.prefForm.value;
                if (current.costeCombustible && current.costeCalorias) {
                    this.prefForm.patchValue({costeCombustible: false, costeCalorias: false}, {emitEvent: false});
                }
            }
        });

        const updateTodoState = () => {
            // Leemos directamente el valor de los controles para asegurar el dato más fresco
            const valComb = this.prefForm.get('costeCombustible')?.value;
            const valCal = this.prefForm.get('costeCalorias')?.value;

            const allSelected = !!(valComb && valCal);

            // Solo actualizamos si el valor es diferente para evitar bucles,
            // y usamos emitEvent: false para no disparar el listener de 'checkTodo'
            if (this.prefForm.get('checkTodo')?.value !== allSelected) {
                this.prefForm.get('checkTodo')?.setValue(allSelected, {emitEvent: false});
            }
        };

        this.prefForm.get('costeCombustible')?.valueChanges.subscribe(updateTodoState);
        this.prefForm.get('costeCalorias')?.valueChanges.subscribe(updateTodoState);
    }

    ngOnDestroy() {
        if (this.deleteTimer) clearInterval(this.deleteTimer);
    }

    async loadPreferences() {
        try {
            this.loading = true;
            const prefs = await this.preferenceService.readPreferences();

            this.prefForm.patchValue({
                tipoRuta: prefs.tipoRuta,
                tipoTransporte: prefs.tipoTransporte,
                matricula: prefs.matricula,
                costeCombustible: prefs.costeCombustible,
                costeCalorias: prefs.costeCalorias,
                checkTodo: prefs.costeCombustible && prefs.costeCalorias
            });

            if (prefs.matricula) {
                try {
                    const vehicle = await this.vehicleService.readVehicle(prefs.matricula);
                    this.selectedVehicleAlias.set(vehicle.alias);
                } catch (e) {
                    this.selectedVehicleAlias.set(prefs.matricula);
                }
            }

            this.updateMatriculaValidation(prefs.tipoTransporte);

            // Guardamos el estado inicial
            this.initialValues = this.prefForm.getRawValue();
        } finally {
            this.loading = false;
        }
    }

    // Comprueba si hay cambios respecto al estado inicial
    get hasChanges(): boolean {
        if (!this.initialValues) return false;
        return JSON.stringify(this.prefForm.getRawValue()) !== JSON.stringify(this.initialValues);
    }

    openVehicleSelector() {
        const dialogRef = this.dialog.open(SavedItemSelector, {
            data: {
                type: 'vehiculos',
                title: 'Seleccionar vehículo habitual',
                showBack: false
            } as SavedSelectorData,
            width: '90%',
            maxWidth: '500px',
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && result !== 'BACK') {
                this.prefForm.patchValue({matricula: result.matricula});
                this.selectedVehicleAlias.set(result.alias);
            }
        });
    }

    clearVehicleSelection(event: Event) {
        event.stopPropagation();
        this.prefForm.patchValue({matricula: null});
        this.selectedVehicleAlias.set('');
    }

    get isVehicleSelected(): boolean {
        return this.prefForm.get('tipoTransporte')?.value === TIPO_TRANSPORTE.VEHICULO;
    }

    updateMatriculaValidation(transportType: TIPO_TRANSPORTE | undefined) {
        const matriculaControl = this.prefForm.get('matricula');
        if (transportType === TIPO_TRANSPORTE.VEHICULO) {
            matriculaControl?.setValidators([Validators.required]);
            matriculaControl?.enable();
            setTimeout(() => {
                matriculaControl?.markAsTouched();
                matriculaControl?.updateValueAndValidity();
            });
        } else {
            matriculaControl?.clearValidators();
            matriculaControl?.disable();
            matriculaControl?.setValue(null);
        }
        matriculaControl?.updateValueAndValidity();
    }

    async onSubmit() {
        if (this.prefForm.invalid) {
            this.prefForm.markAllAsTouched();
            return;
        }
        this.loading = true;

        const formVal = this.prefForm.value;

        const updateModel: Partial<PreferenceModel> = {
            tipoRuta: formVal.tipoRuta,
            tipoTransporte: formVal.tipoTransporte,
            matricula: formVal.matricula,
            costeCombustible: formVal.costeCombustible,
            costeCalorias: formVal.costeCalorias
        };

        try {
            const success = await this.preferenceService.updatePreferences(updateModel);

            if (success) {
                const fullModel = new PreferenceModel(updateModel);
                localStorage.setItem('user_preferences', JSON.stringify(fullModel.toJSON()));

                // Actualizamos el estado inicial con los nuevos valores guardados
                this.initialValues = this.prefForm.getRawValue();

                this.showFeedback('Preferencias guardadas correctamente', 'success-snackbar');
            }
        } catch (error) {

            this.showFeedback('Error al guardar preferencias', 'error-snackbar');
        } finally {
            this.loading = false;
        }
    }

    private showFeedback(message: string, panelClass: string) {
        this.snackBar.open(message, 'Cerrar', {
            duration: 3000,
            panelClass: [panelClass]
        });
    }

    // ==========================================================
    // LÓGICA DE BORRADO DE CUENTA (Migrada de DeleteUser)
    // ==========================================================

    openDeletePopup(): void {
        this.showDeleteModal = true;
        this.deleteCountdown = 5; // Reiniciar contador

        // Iniciar el intervalo
        if (this.deleteTimer) clearInterval(this.deleteTimer);

        this.deleteTimer = setInterval(() => {
            this.deleteCountdown--;
            if (this.deleteCountdown <= 0) {
                clearInterval(this.deleteTimer);
            }
        }, 1000);
    }

    closeDeletePopup(): void {
        this.showDeleteModal = false;
        if (this.deleteTimer) clearInterval(this.deleteTimer);
    }

    confirmDelete(): void {
        this.loading = true; // Reusamos el flag de loading para bloquear la UI
        this.userService.deleteUser()
            .then(() => {
                this.showDeleteModal = false;
                void this.router.navigate([''], { queryParams: { accDeletion: true } });
            })
            .catch((err) => {
                if (err instanceof ReauthNecessaryError) {
                    if (!this.auth.currentUser) {
                        void this.router.navigate([''], { queryParams: { accDeletion: true } });
                    } else {
                        this.openReauthDialog();
                    }
                } else {

                    this.showFeedback('Error al borrar la cuenta', 'error-snackbar');
                    this.showDeleteModal = false;
                }
            })
            .finally(() => {
                this.loading = false;
            });
    }

    private openReauthDialog(): void {
        this.showDeleteModal = false;
        const dialogRef = this.dialog.open(LoginDialogComponent, {
            data: {
                email: this.auth.currentUser?.email,
                isReauth: true
            },
            width: '60vw',
            maxWidth: '90vw',
            maxHeight: '90vh',
            panelClass: 'reauth-dialog-pane',
            disableClose: false,
            autoFocus: true,
            restoreFocus: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result?.success) {
                // Si se re-autenticó con éxito, reintentamos el borrado
                this.confirmDelete();
            }
        });
    }
}
