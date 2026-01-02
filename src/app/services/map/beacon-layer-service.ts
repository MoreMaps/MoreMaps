import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Subject } from 'rxjs';
import { MapCoreService } from './map-core-service';

const BEACON_ICON = L.divIcon({
    className: 'pulsing-beacon',
    html: '<div class="beacon-core"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10]
});

@Injectable({
    providedIn: 'root'
})
export class BeaconLayerService {
    private userMarker: L.Marker | null = null;
    private lastLocation: L.LatLng | null = null;

    // Observables
    private locationFoundSubject = new Subject<L.LatLng>();
    public locationFound$ = this.locationFoundSubject.asObservable();

    private locationErrorSubject = new Subject<any>();
    public locationError$ = this.locationErrorSubject.asObservable();

    constructor(private mapCore: MapCoreService) {}

    startLocating(): void {
        const map = this.mapCore.getMapInstance();
        if (!map) return;

        // Detener cualquier proceso de localización previo
        map.stopLocate();

        // Limpieza de eventos previos para evitar duplicados
        map.off('locationfound');
        map.off('locationerror');

        this.setupEvents(map);

        map.locate({
            setView: false,
            maxZoom: 16,
            watch: false,
            enableHighAccuracy: true,
            timeout: 10000,
        });
    }

    /**
     * Centra el mapa en el usuario.
     * @param animate Si es true usa flyTo (suave), si es false usa setView (directo/instantáneo)
     */
    centerOnUser(animate: boolean = true): void {
        if (!this.lastLocation) {
            this.startLocating();
            return;
        }

        if (animate) {
            this.mapCore.flyTo(this.lastLocation.lat, this.lastLocation.lng, 15);
        } else {
            // Usamos setView para cargas iniciales donde flyTo puede fallar
            this.mapCore.setView(this.lastLocation.lat, this.lastLocation.lng, 15);
        }
    }

    private setupEvents(map: L.Map): void {
        map.on('locationfound', (e: L.LocationEvent) => {
            console.log("Ubicación encontrada");
            this.lastLocation = e.latlng;
            this.drawUserMarker(e.latlng);
            this.locationFoundSubject.next(e.latlng);
        });

        map.on('locationerror', (e: L.ErrorEvent) => {
            this.locationErrorSubject.next(e);
        });
    }

    private drawUserMarker(latlng: L.LatLng): void {
        const map = this.mapCore.getMapInstance();
        if (!map) return;

        if (this.userMarker && !map.hasLayer(this.userMarker)) {
            this.userMarker.remove();
            this.userMarker = null;
        }

        if (this.userMarker) {
            this.userMarker.setLatLng(latlng);
        } else {
            this.userMarker = L.marker(latlng, {
                icon: BEACON_ICON,
                zIndexOffset: 1000
            }).addTo(map);
        }
    }

    public setUserLocation(latlng: L.LatLng): void {
        this.lastLocation = latlng;
        this.drawUserMarker(latlng);
    }
}
