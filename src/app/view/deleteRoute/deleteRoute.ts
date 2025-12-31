import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Geohash } from 'geofire-common';
import {RouteService} from '../../services/Route/route.service';
import {ROUTE_REPOSITORY} from '../../services/Route/RouteRepository';
import {RouteDB} from '../../services/Route/RouteDB';
import {TIPO_TRANSPORTE} from '../../data/RouteModel';

@Component({
    selector: 'app-delete-confirmation-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './deleteRoute.html',
    styleUrls: ['./deleteRoute.css'],
    providers: [RouteService, {provide: ROUTE_REPOSITORY, useClass: RouteDB}]
})
export class DeleteConfirmationRoutePopupComponent {
    @Input() origen: Geohash = " ";
    @Input() destino: Geohash = " ";
    @Input() tipo: TIPO_TRANSPORTE = undefined as unknown as TIPO_TRANSPORTE;
    @Input() alias: string = '';
    @Output() success = new EventEmitter<boolean>();
    @Output() close = new EventEmitter<void>();

    constructor(private service: RouteService) {}

    // Ejecuta el borrado (y cierra el popup, si procede)
    // Propaga el valor obtenido al padre, que es quien muestra el snackbar
    // Si se ha borrado la ruta, debería ser "true" y el padre se cerrará también
    async onConfirm(): Promise<void> {
        this.success.emit(await this.service.deleteRoute(this.origen, this.destino, this.tipo));
        this.close.emit();
    }

    // Envía una señal de cierre
    onClose() {
        this.close.emit();
    }
}
