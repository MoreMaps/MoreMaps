// poi-detail-menu.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import {CommonModule} from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { POIModel } from '../../data/POIModel';
import {POIService} from '../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {notOnlyWhitespaceValidator} from '../../utils/validators';

@Component({
    selector: 'app-poi-modify-menu',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './editPOI.html',
    styleUrls: ['./editPOI.css'],
    providers: [POIService, {provide: POI_REPOSITORY, useClass: POIDB}],
})
export class PoiDetailEdit implements OnInit {
    @Input() poi: POIModel | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() update = new EventEmitter<boolean>();
    editForm!: FormGroup;

    constructor(private fb: FormBuilder, private service: POIService) {}

    ngOnInit(): void {
        this.initForm();
    }

    initForm(): void {
        this.editForm = this.fb.group({
            alias: ['', [Validators.maxLength(50), notOnlyWhitespaceValidator()]],
            description: ['', [Validators.maxLength(150)]]
        });

        // Obtiene los datos del POI y los pone por defecto
        if (this.poi) {
            this.editForm.patchValue({
                alias: this.poi.alias,
                description: this.poi.description
            });
        }
    }

    // Guarda los nuevos datos del POI, y emite el evento de cierre
    async onSave(): Promise<void> {
        if (this.editForm.valid && this.poi) {
            const updatedPOI: Partial<POIModel> = {
                alias: this.editForm.value?.alias,
                description: this.editForm.value?.description
            };
            this.update.emit(await this.service.updatePOI(this.poi.geohash, updatedPOI));
            this.close.emit();
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

    // Para mostrar la longitud de la descripción. Simplemente por estética.
    get descriptionLength(): number {
        return this.editForm.get('description')?.value?.length || 0;
    }
}
