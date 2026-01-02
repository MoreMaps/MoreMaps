import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import {MapCoreService} from './map-core-service';

// Definición de iconos para la ruta
const START_ICON = L.icon({
    iconUrl: 'assets/images/poi/customMarker.png',
    iconSize: [27, 35],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const DESTINATION_ICON = L.icon({
    iconUrl: 'assets/images/poi_destination.png',
    iconSize: [27, 35],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// Estilo de la ruta
const ROUTE_STYLE = {
    color: '#FF9539', // var(--color-orange);
    weight: 6,
    opacity: 0.9,
    lineJoin: 'round' as L.LineJoinShape, // Casting necesario para TS y Leaflet
    lineCap: 'round' as L.LineCapShape
};

@Injectable({
    providedIn: 'root'
})
export class RouteLayerService {
    private routeLayer: L.GeoJSON | null = null;
    private startMarker: L.Marker | null = null;
    private endMarker: L.Marker | null = null;

    constructor(private mapCore: MapCoreService) {}

    /**
     * Dibuja la geometría de la ruta (la línea naranja).
     */
    drawGeometry(geometry: any): void {
        // 1. Limpiar ruta previa si existe
        this.clearGeometry();

        const map = this.mapCore.getMapInstance();
        if (!map) return;

        // 2. Crear capa GeoJSON con estilo
        this.routeLayer = L.geoJSON(geometry, {
            style: ROUTE_STYLE
        }).addTo(map);

        // 3. Ajustar zoom a la ruta
        this.mapCore.fitBounds(this.routeLayer.getBounds(), [50, 200]);
    }

    /**
     * Dibuja los marcadores de Origen y Destino.
     */
    drawAnchors(start: { lat: number; lon: number; name: string },
                end: { lat: number; lon: number; name: string }): void {
        this.clearAnchors();

        const map = this.mapCore.getMapInstance();
        if (!map) return;

        // Marcador Inicio
        this.startMarker = L.marker([start.lat, start.lon], {
            icon: START_ICON
        }).addTo(map).bindPopup(`Origen: ${start.name}`);

        // Marcador Fin
        this.endMarker = L.marker([end.lat, end.lon], {
            icon: DESTINATION_ICON
        }).addTo(map).bindPopup(`Destino: ${end.name}`);
    }

    /**
     * Limpia lo relacionado con la ruta (línea y marcadores).
     */
    clear(): void {
        this.clearGeometry();
        this.clearAnchors();
    }

    private clearGeometry(): void {
        if (this.routeLayer) {
            this.routeLayer.remove();
            this.routeLayer = null;
        }
    }

    private clearAnchors(): void {
        if (this.startMarker) {
            this.startMarker.remove();
            this.startMarker = null;
        }
        if (this.endMarker) {
            this.endMarker.remove();
            this.endMarker = null;
        }
    }

    /** Helper: devuelve si hay una ruta activa
     * */
    hasActiveRoute(): boolean {
        return this.routeLayer != null;
    }
}
