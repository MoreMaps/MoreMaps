import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-placename-search-dialog',
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
    templateUrl: './placename-search-dialog.html',
    styleUrl: './placename-search-dialog.scss'
})
export class PlaceNameSearchDialogComponent {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<PlaceNameSearchDialogComponent>);

    placeForm: FormGroup = this.fb.group({
        placeName: ['', [Validators.required, Validators.minLength(1)]]
    });

    onCancel(): void {
        this.dialogRef.close(null);
    }

    onSearch(): void {
        if (this.placeForm.valid) {
            const { placeName } = this.placeForm.value;
            // Devolvemos el string del nombre
            this.dialogRef.close(placeName);
        } else {
            this.placeForm.markAllAsTouched();
        }
    }

    clearField(event: Event): void {
        event.stopPropagation();
        this.placeForm.get('placeName')?.setValue('');
    }
}
