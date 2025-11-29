import {Component, EventEmitter, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { POIService } from '../../services/POI/poi.service';
import { Geohash } from 'geofire-common';
import { Auth } from '@angular/fire/auth';

@Component({
    selector: 'app-delete-confirmation-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './deletePOI.html',
    styleUrls: ['./deletePOI.css']
})
export class DeleteConfirmationPopupComponent {
    isVisible = true;
    showSnackbar = false;
    @Output() success = new EventEmitter<boolean>();
    private snackbarTimeout: any;
    private geohash: any;
    private auth: any;

    constructor(private service: POIService) {}

    // Componente padre abre el popup, inyecta el geohash del POI
    // ¿Se podría obtener el auth directamente del contexto de la app?
    open(auth: Auth, geohash: Geohash) {
        this.isVisible = true;
        this.geohash = geohash;
        this.auth = auth;
    }

    // Cierra el popup
    onClose() {
        this.isVisible = false;
    }

    // Ejecuta el borrado (y cierra el popup, si procede)
    // Propaga el valor obtenido al padre
    async onConfirm(): Promise<void> {
        this.success.emit(await this.service.deletePOI(this.auth, this.geohash));
        this.displaySnackbar();
    }

    // Mostrar el snackbar
    private displaySnackbar() {
        this.showSnackbar = true;

        // Cerrar después de 3 segundos
        this.snackbarTimeout = setTimeout(() => {
            this.closeSnackbar();
        }, 3000);
    }

    // Cerrar el snackbar
    closeSnackbar() {
        this.showSnackbar = false;
        if (this.snackbarTimeout) {
            clearTimeout(this.snackbarTimeout);
        }
    }
}
