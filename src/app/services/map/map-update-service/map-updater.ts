// map-update.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import * as L from 'leaflet';
import {POISearchModel} from '../../../data/POISearchModel';

@Injectable({ providedIn: 'root' })
export class MapUpdateService {
    public lastKnownLocation: L.LatLng | null = null;
    private markerSubject = new Subject<POISearchModel>();
    marker$ = this.markerSubject.asObservable();

    // Subject para escuchar coordenadas
    private searchCoordsSource = new Subject<{ lat: number, lon: number }>();
    searchCoords$ = this.searchCoordsSource.asObservable();

    // Subject para escuchar topónimos
    private searchPlacenameSource = new Subject<string>();
    searchPlaceName$ = this.searchPlacenameSource.asObservable();

    sendMarker(marker: POISearchModel) {
        this.markerSubject.next(marker);
    }

    private snackbarSubject= new Subject<string>();
    snackbar$ = this.snackbarSubject.asObservable();

    showSnackbar(msg: string): void {this.snackbarSubject.next(msg);}

    // Función para emitir las coordenadas
    triggerCoordinateSearch(lat: number, lon: number) {
        this.searchCoordsSource.next({ lat, lon });
    }

    // Función para emitir el topónimo
    triggerPlacenameSearch(placeName: string) {
        this.searchPlacenameSource.next(placeName);
    }
}
