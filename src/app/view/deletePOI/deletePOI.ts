import {Component, EventEmitter, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Geohash } from 'geofire-common';

@Component({
    selector: 'app-delete-confirmation-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './deletePOI.html',
    styleUrls: ['./deletePOI.css']
})
export class DeleteConfirmationPopupComponent {
    isVisible = false;
    showSnackbar = false;
    private snackbarTimeout: any;

    open() {
        this.isVisible = true;
    }

    close() {
        this.isVisible = false;
    }

    // Cancela la operación
    onCancel() {
        this.close();
    }

    // Ejecuta el borrado, emitiendo un booleano
    onConfirm() {
        this.close();
        this.displaySnackbar();
        // Borrado de POI
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
