// --- MINI-COMPONENTE SPINNER ---
import {Component} from '@angular/core';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

@Component({
    selector: 'app-spinner-snack',
    template: `
        <div style="display: flex; align-items: center; gap: 10px;">
            <mat-spinner diameter="20" color="accent"></mat-spinner>
            <span>Localizando...</span>
        </div>`,
    standalone: true,
    imports: [MatProgressSpinnerModule]
})
export class SpinnerSnackComponent {
} // --- MINI-COMPONENTE: DIÁLOGO DE CARGA BLOQUEANTE ---
@Component({
    selector: 'app-loading-route-dialog',
    template: `
        <div
            style="opacity: 1; background-color: rgba(255, 255, 255, 1); display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px;">
            <mat-spinner diameter="50" color="primary"></mat-spinner>
            <span style="font-size: 1.1em; font-weight: 500;">Calculando la mejor ruta...</span>
            <span style="font-size: 0.9em; color: gray;">Por favor, espera un momento.</span>
        </div>`,
    standalone: true,
    imports: [MatProgressSpinnerModule]
})
export class LoadingRouteDialogComponent {
}
