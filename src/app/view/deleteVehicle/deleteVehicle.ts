import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import {Auth} from '@angular/fire/auth'; // Importar Auth
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
export class DeleteConfirmationVehiclePopupComponent {
    @Input() matricula: string = ""; // Cambiado a string simple o Geohash
    @Input() alias: string = '';
    @Input() auth: Auth | null = null; // AÑADIDO: Input para Auth

    @Output() success = new EventEmitter<boolean>();
    @Output() close = new EventEmitter<void>();

    constructor(private service: VehicleService) {}

    async onConfirm(): Promise<void> {
        if (this.auth && this.matricula) {
            // Pasamos auth y matrícula al servicio
            const result = await this.service.deleteVehicle(this.matricula);
            this.success.emit(result);
            this.close.emit();
        } else {
            console.error("Falta Auth o Matrícula para borrar");
            this.close.emit();
        }
    }

    onClose() {
        this.close.emit();
    }
}
