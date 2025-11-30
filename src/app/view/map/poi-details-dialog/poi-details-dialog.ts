import {Component, EventEmitter, inject, Output, signal, Signal} from '@angular/core';
import {POISearchModel} from '../../../data/POISearchModel';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {DecimalPipe} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {POIService} from '../../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../../services/POI/POIRepository';
import {POIDB} from '../../../services/POI/POIDB';

@Component({
  selector: 'app-poi-details-dialog',
    imports: [
        DecimalPipe,
        MatIconModule, MatButtonModule
    ],
  templateUrl: './poi-details-dialog.html',
  styleUrl: './poi-details-dialog.scss',
  providers: [POIService, {provide: POI_REPOSITORY, useClass: POIDB}],
})
export class PoiDetailsDialog {
    @Output() save = new EventEmitter<void>(); // void = solo envía una señal
    private data = inject<POISearchModel>(MAT_DIALOG_DATA);

    // Señales para mostrar datos por pantalla
    lat: Signal<number> = signal(this.data.lat);
    lon: Signal<number> = signal(this.data.lon);
    placeName: Signal<string> = signal(this.data.placeName);

    private dialogRef = inject(MatDialogRef<PoiDetailsDialog>);

    //El botón de cancelar llamará a esta función
    onCancel(): void {
        // En la lógica del padre, savePOI es relevante
        this.dialogRef.close({savePOI: false});
    }

    // El botón de guardar llamará a esta función
    onSave(): void {
        this.save.emit();
    }
}
