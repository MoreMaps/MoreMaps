import {
    Component,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    signal,
    SimpleChanges
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subscription} from 'rxjs';
import {mapaPreferencia, mapaTransporte, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {RouteService} from '../../services/Route/route.service';
import {notOnlyWhitespaceValidator} from '../../utils/validators';
import {MatSnackBar} from '@angular/material/snack-bar';
import {VehicleModel} from '../../data/VehicleModel';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {InvalidDataError} from '../../errors/InvalidDataError';

@Component({
    selector: 'app-edit-route',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './editRoute.html',
    styleUrls: ['./editRoute.css'],
})
export class EditRouteComponent implements OnInit, OnChanges, OnDestroy {
    @Input() route: RouteModel | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() update = new EventEmitter<RouteModel | null>();

    editForm!: FormGroup;
    isSaving = signal(false);
    showMatricula = signal(false);
    savedVehicles = signal<VehicleModel[]>([]);

    // Opciones para los selects
    transportOptions = Object.entries(mapaTransporte).map(([key, value]) => ({key, value}));
    preferenceOptions = Object.entries(mapaPreferencia).map(([key, value]) => ({key, value}));

    private fb = inject(FormBuilder);
    private service = inject(RouteService);
    private vehicleRepo = inject(VEHICLE_REPOSITORY);
    private snackBar = inject(MatSnackBar);

    private sub: Subscription | null = null;
    private lastValidTransport: string = ''; // para revertir cambios si no hay coche

    async ngOnInit(): Promise<void> {
        this.initFormStructure();

        await this.loadUserVehicles();

        if (this.route) {
            this.updateFormValues(this.route);
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['route'] && changes['route'].currentValue) {
            if (this.editForm) {
                const r = changes['route'].currentValue;
                this.updateFormValues(r);
                this.lastValidTransport = r.transporte;
                this.checkTransportType(r.transporte, false);
            }
        }
    }

    private async loadUserVehicles() {
        try {
            const vehicles = await this.vehicleRepo.getVehicleList();
            this.savedVehicles.set(vehicles);
        } catch (e) {
            console.error('Error cargando vehículos', e);
            this.savedVehicles.set([]);
        }
    }

    initFormStructure() {
        this.editForm = this.fb.group({
            alias: ['', [Validators.required, Validators.maxLength(100), notOnlyWhitespaceValidator()]],
            transporte: ['', [Validators.required]],
            preferencia: ['', [Validators.required]],
            matricula: [''] // Validadores dinámicos
        });

        this.sub = this.editForm.get('transporte')!.valueChanges.subscribe(val => {
            this.checkTransportType(val, true);
        });
    }

    /**
     * Valida si el transporte es vehículo y si el usuario tiene vehículos guardados.
     * @param type Tipo de transporte seleccionado
     * @param fromUserInteraction Indica si el cambio viene del usuario (para mostrar SnackBar)
     */
    private checkTransportType(type: string, fromUserInteraction: boolean) {
        const isCar = type === TIPO_TRANSPORTE.VEHICULO;

        // CASO: Selecciona coche, pero NO tiene vehículos guardados
        if (isCar && this.savedVehicles().length === 0) {
            if (fromUserInteraction) {
                this.snackBar.open('No tienes vehículos guardados. Crea uno primero.', 'Cerrar', {
                    duration: 3000,
                });

                // Revertir al valor anterior sin emitir evento (para evitar bucle)
                this.editForm.get('transporte')?.setValue(this.lastValidTransport, {emitEvent: false});
            }
            return;
        }

        // Si el cambio es válido, actualizamos el estado
        this.lastValidTransport = type;
        this.showMatricula.set(isCar);

        const matriculaControl = this.editForm.get('matricula');
        if (isCar) {
            matriculaControl?.setValidators([Validators.required]);
        } else {
            matriculaControl?.clearValidators();
            matriculaControl?.setValue('');
        }
        matriculaControl?.updateValueAndValidity();
    }

    updateFormValues(r: RouteModel) {
        this.editForm.patchValue({
            alias: r.alias,
            transporte: r.transporte,
            preferencia: r.preferencia,
            matricula: r.matricula || ''
        });
    }

    async onSave(): Promise<void> {
        if (this.editForm.invalid) {
            this.editForm.markAllAsTouched();
            return;
        }

        if (!this.route) return;

        this.isSaving.set(true);
        const f = this.editForm.getRawValue();

        const updateData: Partial<RouteModel> = {
            alias: f.alias,
            transporte: f.transporte,
            preferencia: f.preferencia,
            // Si es vehículo, guardamos la matrícula seleccionada, si no, undefined
            ...(f.transporte === TIPO_TRANSPORTE.VEHICULO ? { matricula: f.matricula } : {})
        };

        try {
            // updateRoute maneja el recálculo (MapService) si cambia transporte/preferencia
            // y maneja el cambio de ID (borrado y creación) en Firestore si cambia el transporte.
            const updatedRoute = await this.service.updateRoute(
                this.route.geohash_origen,
                this.route.geohash_destino,
                this.route.transporte, // Pasamos el transporte original para encontrar la ruta vieja
                updateData,
                this.route.matricula
            );

            this.update.emit(updatedRoute);

        } catch (error) {
            // Manejo específico si no hay cambios
            if (error instanceof InvalidDataError) {
                this.snackBar.open('No se han detectado cambios', 'Cerrar', {
                    duration: 3000,
                    horizontalPosition: 'start',
                    verticalPosition: 'bottom'
                });
            } else {
                console.error(error);
                this.update.emit(null);
            }
        } finally {
            this.isSaving.set(false);
        }
    }

    onCancel(): void {
        this.editForm.reset();
        this.close.emit();
    }

    clearField(fieldName: string): void {
        this.editForm.patchValue({[fieldName]: ''});
        this.editForm.get(fieldName)?.markAsDirty();
    }

    ngOnDestroy() {
        if (this.sub) this.sub.unsubscribe();
    }
}
