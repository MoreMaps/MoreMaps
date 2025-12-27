import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-coords-search-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './coords-search-dialog.html',
    styleUrl: './coords-search-dialog.scss'
})
export class CoordsSearchDialogComponent {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<CoordsSearchDialogComponent>);

    coordsForm: FormGroup = this.fb.group({
        // Orden visual: Longitud arriba, Latitud abajo en la imagen
        lon: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
        lat: ['', [Validators.required, Validators.min(-90), Validators.max(90)]]
    });

    onCancel(): void {
        this.dialogRef.close(null);
    }

    onSearch(): void {
        if (this.coordsForm.valid) {
            const { lat, lon } = this.coordsForm.value;
            // Los valores se convierten a Number (por seguridad) y se cierra el diálogo.
            this.dialogRef.close({ lat: Number(lat), lon: Number(lon) });
        } else {
            this.coordsForm.markAllAsTouched();
        }
    }

    // Helper para limpiar inputs individualmente (botones 'X')
    clearField(fieldName: string, event: Event): void {
        event.stopPropagation();
        this.coordsForm.get(fieldName)?.setValue('');
    }

}
