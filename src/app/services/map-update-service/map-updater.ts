// map-update.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface MapMarker {
    name: string;
    lat: number;
    lon: number;
}

@Injectable({ providedIn: 'root' })
export class MapUpdateService {
    private markerSubject = new Subject<MapMarker>();
    marker$ = this.markerSubject.asObservable();

    sendMarker(marker: MapMarker) {
        this.markerSubject.next(marker);
    }

    private snackbarSubject= new Subject<string>();
    snackbar$ = this.snackbarSubject.asObservable();

    showSnackbar(msg: string): void {this.snackbarSubject.next(msg);}
}
