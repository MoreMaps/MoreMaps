import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { POIService } from '../../services/POI/poi.service';
import { Geohash } from 'geofire-common';
import { Auth } from '@angular/fire/auth';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';

@Component({
    selector: 'app-delete-confirmation-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './deletePOI.html',
    styleUrls: ['./deletePOI.css'],
    providers: [POIService, {provide: POI_REPOSITORY, useClass: POIDB}]
})
export class DeleteConfirmationPOIPopupComponent {
    @Input() geohash: Geohash = " ";
    @Input() auth: Auth;
    @Input() poiName: string = '';
    @Output() success = new EventEmitter<boolean>();
    @Output() close = new EventEmitter<void>();

    constructor(private service: POIService, a: Auth) {this.auth = a}

    // Ejecuta el borrado (y cierra el popup, si procede)
    // Propaga el valor obtenido al padre, que es quien muestra el snackbar
    // Si se ha borrado el POI, debería ser "true" y el padre se cerrará también
    async onConfirm(): Promise<void> {
        this.success.emit(await this.service.deletePOI(this.auth, this.geohash));
        this.close.emit();
    }

    // Envía una señal de cierre
    onClose() {
        this.close.emit();
    }
}
