import {Component, computed, effect, inject, Signal, signal} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {Auth} from '@angular/fire/auth';
import {Router} from "@angular/router";
import {MatSnackBar} from '@angular/material/snack-bar';
import {VehicleModel} from '../../data/VehicleModel';
import {VehicleAlreadyExistsError} from '../../errors/Vehicle/VehicleAlreadyExistsError';
import {ForbiddenContentError} from '../../errors/ForbiddenContentError';
import {MatError, MatFormField, MatLabel} from '@angular/material/form-field';
import {MatIcon} from '@angular/material/icon';
import {MatOption, MatSelect} from '@angular/material/select';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatInput} from '@angular/material/input';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';
import {NavbarComponent} from '../navbar/navbar.component';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';


const FUEL_TYPES = ['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido (HEV)',
    'Híbrido Enchufable (PHEV)', 'GLP', 'GNC', 'Hidrógeno'];


@Component({
    selector: 'vehicle-form',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatIcon,
        MatError,
        MatSelect,
        MatOption,
        MatProgressSpinner,
        MatIconButton,
        MatInput,
        MatButton,
        NavbarComponent,
        ProfileButtonComponent,
        ThemeToggleComponent
    ],
    templateUrl: './vehicleForm.html',
    styleUrl: './vehicleForm.scss',
    providers: [VehicleService, {provide: VEHICLE_REPOSITORY, useValue: VehicleDB}],
})
export class VehicleForm {
    private fb = inject(FormBuilder);
    private vehicleService: VehicleService = inject(VehicleService);
    private auth: Auth;
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);

    constructor(auth: Auth) {
        this.auth = auth;

        // reacciona a cambios en isLoading para (des)habilitar el formulario
        effect(() => {
            if (this.isLoading()) this.vehicleForm.disable();
            else this.vehicleForm.enable();
        });
    }

    isLoading = signal<boolean>(false);
    fuelTypes = signal<string[]>(FUEL_TYPES);

    currentYear = new Date().getFullYear();
    vehicleForm: FormGroup = this.fb.nonNullable.group({
        matricula: ['', [Validators.required]],
        alias: ['', [Validators.required]],
        marca: ['', [Validators.required]],
        modelo: ['', [Validators.required]],
        anyo: [this.currentYear, [
            Validators.required,
            Validators.min(1900),
            Validators.max(this.currentYear + 1)
        ]],
        consumoMedio: [null, [Validators.required, Validators.min(0.1)]],
        tipoCombustible: ['', [Validators.required]]
    });

    // Con esto podemos cambiar el tipo de unidad del combustible dinámicamente
    private fuelValue$ = this.vehicleForm.get('tipoCombustible')!.valueChanges;
    selectedFuel: Signal<String> = toSignal(this.fuelValue$, {initialValue: ''});
    consumptionUnit = computed(() => {
        const fuel = this.selectedFuel();
        if (fuel === 'Eléctrico' || fuel === 'Híbrido Enchufable (PHEV)')
            return 'kWh/100km';
        else if (fuel === 'Hidrógeno')
            return 'kg/100km';
        return 'L/100km';
    });

    async onSubmit() {
        if (this.vehicleForm.invalid) {
            this.vehicleForm.markAllAsTouched();
            return;
        }
        this.isLoading.set(true);

        try {
            // Llamamos al servicio
            const f = this.vehicleForm.getRawValue();
            const vehicleForService = new VehicleModel(
                f.alias,
                f.matricula.replace(/\s/g, '').toUpperCase(), // 1234 xyz -> 1234XYZ
                f.marca,
                f.modelo,
                Number(f.anyo),
                f.tipoCombustible,
                Number(f.consumoMedio)
            );
            await this.vehicleService.createVehicle(this.auth, vehicleForService);

            // Éxito
            this.showSuccessSnackBar(vehicleForService.matricula);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isLoading.set(false);
        }
    }

    private showSuccessSnackBar(matricula: string) {
        const snackBarRef =
            this.snackBar.open(`Vehículo ${matricula} registrado correctamente`, 'VER', {
                duration: 5000,
                panelClass: 'success-snackbar',
                horizontalPosition: 'left',
                verticalPosition: 'bottom'
            });

        snackBarRef.onAction().subscribe(() => {
            this.router.navigate(['/saved'], {
                queryParams: {
                    type: 'vehicle',
                    id: matricula,
                }
            });
        });
    }

    private handleError(error: any) {
        let msg: string;

        if (error instanceof VehicleAlreadyExistsError) {
            msg = 'Ya existe un vehículo con esa matrícula.'
            this.vehicleForm.get('matricula')?.setErrors({alreadyExists: true})
        } else if (error instanceof ForbiddenContentError) {
            msg = 'No puedes crear vehículos en una colección que no te pertenece.'
        } else msg = error.message;

        this.snackBar.open(msg, 'CERRAR', {
            duration: 5000,
            panelClass: 'error-snackbar',
        });
    }

    clearField(fieldName: string) {
        if (!this.isLoading())
            this.vehicleForm.get(fieldName)?.reset();
    }
}
