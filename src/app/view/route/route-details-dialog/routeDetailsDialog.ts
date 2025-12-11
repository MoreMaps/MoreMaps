import { Component, EventEmitter, Inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouteResultModel } from '../../../data/RouteResultModel';
import { TIPO_TRANSPORTE } from '../../../data/RouteModel';
import {MatTooltip} from '@angular/material/tooltip';

export interface RouteDialogData {
    origenName: string;
    destinoName: string;
    transporte: TIPO_TRANSPORTE;
    routeResult: RouteResultModel;
    matricula?: string;     // Opcional
    vehicleAlias?: string;  // Opcional (para mostrar nombre amigable)
    coste?: number;         // Coste calculado
}

@Component({
    selector: 'app-route-details-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatTooltip],
    templateUrl: './routeDetailsDialog.html',
    styleUrls: ['./routeDetailsDialog.scss']
})
export class RouteDetailsDialog {
    @Output() save = new EventEmitter<void>();
    @Output() closeRoute = new EventEmitter<void>();

    constructor(
        public dialogRef: MatDialogRef<RouteDetailsDialog>,
        @Inject(MAT_DIALOG_DATA) public data: RouteDialogData
    ) {}

    // Helpers para formateo
    get distanceKm(): string {
        return (this.data.routeResult.distancia / 1000).toFixed(2) + ' km';
    }

    get durationString(): string {
        const seconds = this.data.routeResult.tiempo;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);

        if (h > 0) return `${h} h ${m} min`;
        return `${m} min`;
    }

    get iconTransporte(): string {
        switch (this.data.transporte) {
            case TIPO_TRANSPORTE.VEHICULO: return 'directions_car';
            case TIPO_TRANSPORTE.BICICLETA: return 'pedal_bike';
            case TIPO_TRANSPORTE.A_PIE: return 'directions_walk';
            default: return 'directions_car';
        }
    }

    onSave(): void {
        this.save.emit();
    }

    onClose(): void {
        this.closeRoute.emit();
        this.dialogRef.close();
    }
}
