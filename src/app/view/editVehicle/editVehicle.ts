import {
    Component,
    computed,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    signal,
    SimpleChanges
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';
import {Subscription} from 'rxjs';

const MIN_YEAR = 1900;
const MIN_CONSUMO = 0.1;
const FUEL_TYPES = ['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido (HEV)',
    'Híbrido Enchufable (PHEV)', 'GLP', 'GNC', 'Hidrógeno'];

@Component({
    selector: 'app-edit-vehicle',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './editVehicle.html',
    styleUrls: ['./editVehicle.css'],
    providers: [VehicleService, {provide: VEHICLE_REPOSITORY, useClass: VehicleDB}]
})
export class EditVehicleComponent implements OnInit, OnChanges {
    @Input() vehicle: VehicleModel | null = null;
    @Input() auth: Auth | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() update = new EventEmitter<VehicleModel | null>();

    editForm!: FormGroup;

    readonly currentYear = new Date().getFullYear();
    readonly maxYear = this.currentYear + 1;
    readonly minYear = MIN_YEAR;
    readonly minConsumoMedio = MIN_CONSUMO;
    protected readonly FUEL_TYPES = FUEL_TYPES;

    private fb = inject(FormBuilder);
    private service = inject(VehicleService);

    selectedFuel = signal<string>('');

    // Computed depende de la señal selectedFuel
    consumptionUnit = computed(() => {
        const fuel = this.selectedFuel();
        if (fuel === 'Eléctrico' || fuel === 'Híbrido Enchufable (PHEV)') return 'kWh/100km';
        if (fuel === 'Hidrógeno') return 'kg/100km';
        return 'L/100km';
    });

    private sub: Subscription | null = null;

    ngOnInit(): void {
        this.initFormStructure();
        // Si ya hay vehículo al iniciar, parcheamos los valores
        if (this.vehicle) {
            this.updateFormValues(this.vehicle);
        }
    }

    // Detecta cambios en el Input vehicle (cuando el padre lo carga)
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['vehicle'] && changes['vehicle'].currentValue) {
            // Si el formulario ya existe, actualizamos los valores
            if (this.editForm) {
                this.updateFormValues(changes['vehicle'].currentValue);
            }
        }
    }

    // 1. Inicializa la estructura vacía (solo una vez)
    initFormStructure() {
        this.editForm = this.fb.group({
            alias: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(150)]],
            matricula: ['', [Validators.required, Validators.pattern("^[0-9]{4}[A-Z]{3}$")]],
            marca: ['', [Validators.required]],
            modelo: ['', [Validators.required]],
            anyo: [this.currentYear, [
                Validators.required,
                Validators.min(this.minYear),
                Validators.max(this.maxYear),
                Validators.pattern("^[0-9]*$")
            ]],
            tipoCombustible: ['', [Validators.required]],
            consumoMedio: [0, [Validators.required, Validators.min(0.1)]]
        });

        // Suscribirse manualmente a los cambios de combustible para actualizar la señal
        this.sub = this.editForm.get('tipoCombustible')!.valueChanges.subscribe(val => {
            this.selectedFuel.set(val || '');
        });
    }

    // 2. Función auxiliar para rellenar el formulario
    updateFormValues(v: VehicleModel) {
        this.editForm.patchValue({
            alias: v.alias,
            matricula: v.matricula, // Ahora entra limpio
            marca: v.marca,
            modelo: v.modelo,
            anyo: v.anyo,
            tipoCombustible: v.tipoCombustible,
            consumoMedio: v.consumoMedio
        });
        // Actualizamos la señal manualmente para que se refresque la UI
        this.selectedFuel.set(v.tipoCombustible);
    }

    async onSave(): Promise<void> {
        if(this.editForm.invalid) {
            this.editForm.markAllAsTouched();
            return;
        }

        if (this.vehicle && this.auth) {
            const f = this.editForm.getRawValue();

            // Se construye el objeto parcial con los cambios
            const updatedVehicleParts: Partial<VehicleModel> = {
                alias: f.alias,
                matricula: f.matricula.replace(/\s/g, '').toUpperCase(),
                marca: f.marca,
                modelo: f.modelo,
                anyo: Number(f.anyo),
                tipoCombustible: f.tipoCombustible,
                consumoMedio: Number(f.consumoMedio)
            };

            const success = await this.service.updateVehicle(this.vehicle.matricula, updatedVehicleParts);

            // Si es exitoso, se mezclan los datos viejos con los nuevos y emitimos el objeto completo
            if (success) {
                const finalVehicle = {...this.vehicle, ...updatedVehicleParts} as VehicleModel;
                this.update.emit(finalVehicle);
            } else {
                this.update.emit(null);
            }
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
