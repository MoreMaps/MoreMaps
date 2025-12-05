import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Geohash } from 'geofire-common';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';

@Component({
    selector: 'app-delete-confirmation-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './deleteVehicle.html',
    styleUrls: ['./deleteVehicle.css'],
    providers: [VehicleService, {provide: VEHICLE_REPOSITORY, useClass: VehicleDB}]
})
export class DeleteConfirmationPopupComponent {
    @Input() matricula: Geohash = " ";
    @Input() alias: string = '';
    @Output() success = new EventEmitter<boolean>();
    @Output() close = new EventEmitter<void>();

    constructor(private service: VehicleService) {}

    // Ejecuta el borrado (y cierra el popup, si procede)
    // Propaga el valor obtenido al padre, que es quien muestra el snackbar
    // Si se ha borrado el vehículo, debería ser "true" y el padre se cerrará también
    async onConfirm(): Promise<void> {
        this.success.emit(await this.service.deleteVehicle(this.matricula));
        this.close.emit();
    }

    // Envía una señal de cierre
    onClose() {
        this.close.emit();
    }
}
