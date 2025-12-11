import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../../data/RouteModel';
import {MatProgressBar} from '@angular/material/progress-bar';

export interface RouteOptionsData {
    showBack: boolean;
    currentStep: number;
    totalSteps: number;
    type: 'transport' | 'preference';
}

@Component({
    selector: 'app-route-options-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatProgressBar],
    templateUrl: './route-options-dialog.html',
    styleUrls: ['./route-options-dialog.scss']
})
export class RouteOptionsDialogComponent {
    private dialogRef = inject(MatDialogRef<RouteOptionsDialogComponent>);
    public data = inject<RouteOptionsData>(MAT_DIALOG_DATA);

    // Exponemos los Enums a la plantilla
    eTransporte = TIPO_TRANSPORTE;
    ePreferencia = PREFERENCIA;

    selectOption(value: TIPO_TRANSPORTE | PREFERENCIA | null): void {
        this.dialogRef.close(value);
    }

    goBack(): void {
        this.dialogRef.close('BACK');
    }
}
