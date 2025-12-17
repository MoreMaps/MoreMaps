import {Component, EventEmitter, Inject, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {RouteResultModel} from '../../../data/RouteResultModel';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../../data/RouteModel';
import {MatTooltip} from '@angular/material/tooltip';
import {MatOption, MatSelect} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import {RouteCostResult} from '../../../services/Route/route.service';

export interface RouteDialogData {
    origenName: string;
    destinoName: string;
    transporte: TIPO_TRANSPORTE;
    preference: PREFERENCIA;
    routeResult: RouteResultModel;
    matricula?: string;              // Opcional
    nombreVehiculo?: string;         // Opcional
    vehicleAlias?: string;           // Opcional (para mostrar nombre amigable)
    coste?: RouteCostResult;         // Coste calculado
}

@Component({
    selector: 'app-route-details-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatTooltip, MatSelect, MatOption, FormsModule],
    templateUrl: './routeDetailsDialog.html',
    styleUrls: ['./routeDetailsDialog.scss']
})
export class RouteDetailsDialog {
    @Output() save = new EventEmitter<void>();
    @Output() closeRoute = new EventEmitter<void>();


    // Eventos de modificación de ruta
    @Output() editOrigin = new EventEmitter<void>();
    @Output() editDestination = new EventEmitter<void>();
    @Output() swap = new EventEmitter<void>();
    @Output() editTransport = new EventEmitter<void>();
    @Output() preferenceChange = new EventEmitter<PREFERENCIA>();

    // Exponer enums al template
    protected readonly PREFERENCIA = PREFERENCIA;
    protected readonly TIPO_TRANSPORTE = TIPO_TRANSPORTE

    constructor(
        public dialogRef: MatDialogRef<RouteDetailsDialog>,
        @Inject(MAT_DIALOG_DATA) public data: RouteDialogData
    ) {
    }

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
            case TIPO_TRANSPORTE.VEHICULO:
                return 'directions_car';
            case TIPO_TRANSPORTE.BICICLETA:
                return 'pedal_bike';
            case TIPO_TRANSPORTE.A_PIE:
                return 'directions_walk';
            default:
                return 'directions_car';
        }
    }

    // Estos métodos emiten al padre para que maneje la lógica (abrir buscador, recalcular, etc)
    onEditOrigin() {
        this.editOrigin.emit();
    }

    onEditDestination() {
        this.editDestination.emit();
    }

    onSwap() {
        this.swap.emit();
    }

    onEditTransport() {
        this.editTransport.emit();
    }

    onPreferenceChange(newValue: PREFERENCIA) {
        this.preferenceChange.emit(newValue); // Avisar al padre para recalcular
    }

    onSave(): void {
        this.save.emit();
    }

    onClose(): void {
        this.closeRoute.emit();
        this.dialogRef.close();
    }
}
