import {Component, EventEmitter, inject, Output, signal, WritableSignal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {DecimalPipe} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {POIService} from '../../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../../services/POI/POIRepository';
import {POIDB} from '../../../services/POI/POIDB';
import {POISearchModel} from '../../../data/POISearchModel';
import {Geohash, geohashForLocation} from 'geofire-common';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
    selector: 'app-poi-details-dialog',
    imports: [
        DecimalPipe,
        MatIconModule, MatButtonModule, MatTooltip
    ],
    templateUrl: './poi-details-dialog.html',
    styleUrl: './poi-details-dialog.scss',
    providers: [POIService, {provide: POI_REPOSITORY, useClass: POIDB}],
})
export class PoiDetailsDialog {
    @Output() save = new EventEmitter<void>(); // void = solo envía una señal
    @Output() next = new EventEmitter<void>(); // void = solo envía una señal
    @Output() prev = new EventEmitter<void>(); // void = solo envía una señal

    private data = inject<any>(MAT_DIALOG_DATA);

    // Señales para mostrar datos por pantalla
    lat: WritableSignal<number> = signal(this.data.currentPOI.lat);
    lon: WritableSignal<number> = signal(this.data.currentPOI.lon);
    placeName: WritableSignal<string> = signal(this.data.currentPOI.placeName);
    currentIndex: WritableSignal<number> = signal(this.data.currentIndex);
    totalPOIs: WritableSignal<number> = signal(this.data.totalPOIs);
    savedPOIs: WritableSignal<Geohash[]> = signal(this.data.savedPOIs);

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

    onNext(): void {
        this.next.emit();
    }

    onPrevious(): void {
        this.prev.emit();
    }

    public updatePOI(poi: POISearchModel, index: number, savedPois: Geohash[]): void {
        this.lat.set(poi.lat);
        this.lon.set(poi.lon);
        this.placeName.set(poi.placeName);
        this.currentIndex.set(index);
        this.savedPOIs.set(savedPois);
    }

    obtainGeohash(): Geohash {
        return geohashForLocation([this.lat(), this.lon()], 7)
    }
}
