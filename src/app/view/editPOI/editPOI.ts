// poi-detail-menu.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { POIModel } from '../../data/POIModel';

@Component({
    selector: 'app-poi-detail-menu',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgOptimizedImage],
    templateUrl: './editPOI.html',
    styleUrls: ['./editPOI.css']
})
export class PoiDetailMenuComponent implements OnInit {
    @Input() poi: Partial<POIModel> | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() update = new EventEmitter<Partial<POIModel>>();

    isEditing = false;
    editForm!: FormGroup;

    constructor(private fb: FormBuilder) {}

    ngOnInit(): void {
        this.initForm();
    }

    initForm(): void {
        this.editForm = this.fb.group({
            alias: ['', ],
            description: ['', [Validators.maxLength(150)]]
        });
    }

    // Obtiene los datos del POI y los pone por defecto
    onEdit(): void {
        if (this.poi) {
            this.editForm.patchValue({
                alias: this.poi.alias,
                description: this.poi.description
            });
            this.isEditing = true;
        }
    }

    // Guarda los nuevos datos del POI, y cierra el formulario
    onSave(): void {
        if (this.editForm.valid && this.poi) {
            const updatedPOI: Partial<POIModel> = {
                alias: this.editForm.value?.alias,
                description: this.editForm.value?.description
            };
            this.updatePOI(updatedPOI);
        }
        this.isEditing = false;
        this.editForm.reset();
    }

    // Cancela la operación
    onCancel(): void {
        this.isEditing = false;
        this.editForm.reset();
    }

    // Emite el valor de cierre
    onClose(): void {
        this.isEditing = false;
        this.close.emit();
    }

    onNewRoute(): void {
        // Implementar lógica para nueva ruta
        console.log('Nueva ruta desde:', this.poi);
    }

    onDelete(): void {
        // Implementar lógica para eliminar
        console.log('Eliminar POI:', this.poi);
    }

    // Emite el valor del formulario
    updatePOI(poi: Partial<POIModel>): void {
        this.update.emit(poi);
        this.isEditing = false;
    }

    // Limpia el campo "X"
    clearField(fieldName: string): void {
        this.editForm.patchValue({ [fieldName]: '' });
    }

    // Para mostrar la longitud de la descripción. Simplemente por estética.
    get descriptionLength(): number {
        return this.editForm.get('description')?.value?.length || 0;
    }
}
