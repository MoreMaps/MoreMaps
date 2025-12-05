import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VehicleModel} from '../../data/VehicleModel';

@Component({
    selector: 'app-edit-vehicle',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './editVehicle.html',
    styleUrls: ['./editVehicle.css']
})
export class EditVehicleComponent implements OnInit {
    @Input() vehicle: VehicleModel | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() update = new EventEmitter<boolean>();

    editForm!: FormGroup;
    vehicleForm!: FormGroup;
    constructor(private fb: FormBuilder, private service: VehicleService) {
    }

    ngOnInit(): void {
        this.initForm();
    }

    initForm() {
        this.editForm = this.fb.group({
            alias: ['', Validators.required],
            anyo: ['', Validators.required],
            marca: ['', Validators.required],
            modelo: ['', Validators.required],
            matricula: ['', Validators.required],
            consumoMedio: ['', [Validators.required, Validators.min(0.1)]],
            tipoCombustible: ['', Validators.required]
        });

        // Obtiene los datos del vehículo y los pone por defecto
        if (this.vehicle) {
            this.editForm.patchValue({
                alias: this.vehicle.alias,
                anyo: this.vehicle.anyo,
                marca: this.vehicle.marca,
                modelo: this.vehicle.modelo,
                matricula: this.vehicle.matricula,
                consumoMedio: this.vehicle.consumoMedio,
                tipoCombustible: this.vehicle.tipoCombustible
            });
        }
    }

    // Cancela la operación y emite el evento de cierre
    onCancel(): void {
        this.editForm.reset();
        this.close.emit();
    }

    // Limpia el campo "X"
    clearField(fieldName: string): void {
        this.editForm.patchValue({ [fieldName]: '' });
    }

    // Guarda los nuevos datos del POI, y emite el evento de cierre
    async onSave(): Promise<void> {
        if (this.editForm.valid && this.vehicle) {
            const updatedVehicle: Partial<VehicleModel> = {
                alias: this.vehicle.alias,
                anyo: this.vehicle.anyo,
                marca: this.vehicle.marca,
                modelo: this.vehicle.modelo,
                matricula: this.vehicle.matricula,
                consumoMedio: this.vehicle.consumoMedio
            };
            this.update.emit(await this.service.updateVehicle(this.vehicle.matricula, updatedVehicle));
            this.close.emit();
        }
    }
}
