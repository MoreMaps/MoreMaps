import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    OnChanges, // Importante: Importar OnChanges
    Output,
    SimpleChanges, // Importante
    inject,
    signal,
    computed
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';
import {Subscription} from 'rxjs';

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
    @Output() update = new EventEmitter<boolean>();

    private fb = inject(FormBuilder);
    private service = inject(VehicleService);

    editForm!: FormGroup;
    fuelTypes = signal<string[]>(FUEL_TYPES);
    currentYear = new Date().getFullYear();

    // Usamos una señal escribible en lugar de toSignal para evitar problemas de contexto al recargar
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
            alias: ['', [Validators.required]],
            matricula: ['', [Validators.required]], // CORREGIDO: Sin llaves {}
            marca: ['', [Validators.required]],
            modelo: ['', [Validators.required]],
            anyo: [this.currentYear, [Validators.required, Validators.min(1900), Validators.max(this.currentYear + 1)]],
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
        if (this.editForm.valid && this.vehicle && this.auth) {
            const f = this.editForm.getRawValue();

            const updatedVehicle: Partial<VehicleModel> = {
                alias: f.alias,
                matricula: f.matricula.replace(/\s/g, '').toUpperCase(),
                marca: f.marca,
                modelo: f.modelo,
                anyo: Number(f.anyo),
                tipoCombustible: f.tipoCombustible,
                consumoMedio: Number(f.consumoMedio)
            };

            const success = await this.service.updateVehicle(this.vehicle.matricula, updatedVehicle);
            this.update.emit(success);
        }
    }

    onCancel(): void {
        this.editForm.reset();
        this.close.emit();
    }

    clearField(fieldName: string): void {
        this.editForm.patchValue({ [fieldName]: '' });
    }

    ngOnDestroy() {
        if (this.sub) this.sub.unsubscribe();
    }
}
