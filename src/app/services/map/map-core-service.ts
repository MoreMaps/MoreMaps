import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import * as L from 'leaflet';

/** Se encarga de gestionar la estancia de L.Map.
 * Sus funciones incluyen inicializar el mapa, configurar los tiles,
 * gestionar el DOM del contenedor y exponer la instancia del mapa para que otros servicios
 * puedan pintar sobre él.
 *
 * Si quisieramos cambiar de OpenStreetMap a Google Maps u otro proveedor, solo haría
 * falta editar esta clase
 * */

@Injectable({
    providedIn: 'root'
})
export class MapCoreService {
    private map: L.Map | null = null;

    // Observable para comunicar clicks en el mapa al orquestador
    private mapClickSubject = new Subject<{lat:number; lon:number}>();
    mapClick$ = this.mapClickSubject.asObservable();

    constructor() {}

    /** Inicializa el mapa en el elemento DOM seleccionado.
     *  Contiene la configuración de límites y Tiles de OpenStreetMap
     * */
    initMap(element: HTMLElement) {
        if (this.map) return;

        // Configuración de límites
        const latBuffer = 50;
        const lonBuffer = 50;
        const southWest = L.latLng(-90 - latBuffer, -180 - lonBuffer);
        const northEast = L.latLng(90 + latBuffer, 180 + lonBuffer);
        const bounds = L.latLngBounds(southWest, northEast);

        // Inicialización de Leaflet
        this.map = L.map(element, {
            maxBounds: bounds,
            maxBoundsViscosity: 0.5,
            zoomControl: false, // Se mantiene false según tu configuración original
        });

        // Configuración de Tiles (OSM)
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        L.tileLayer(osmUrl, {
            maxZoom: 19,
            minZoom: 3,
            noWrap: true,
            attribution: '© OpenStreetMap contributors',
        }).addTo(this.map);

        // Configuración de vista por defecto (Castellón de la Plana)
        this.map.setView([39.9864, -0.0513], 13);

        // Gestión del resize inicial
        this.map.whenReady(() => {
            setTimeout(() => {
                this.invalidateSize();
            }, 100);
        });

        // Setup de eventos básicos
        this.setupBaseEvents();
    }

    /**
     * Limpia la instancia del mapa para evitar fugas de memoria.
     */
    destroy(): void {
        if (this.map) {
            this.map.off();     // Elimina listeners
            this.map.remove();  // Destruye el DOM del mapa
            this.map = null;
        }
    }

    /**
     * Fuerza el redibujado del mapa (útil cuando el contenedor cambia de tamaño)
     */
    invalidateSize(): void {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    // --- Métodos de Control de Cámara ---

    flyTo(lat: number, lon: number, zoom: number = 16): void {
        this.map?.flyTo([lat, lon], zoom, { animate: true, duration: 1 });
    }

    setView(lat: number, lon: number, zoom: number): void {
        this.map?.setView([lat, lon], zoom);
    }

    panTo(lat: number, lon: number): void {
        this.map?.panTo([lat, lon], { animate: true, duration: 0.5 });
    }

    fitBounds(bounds: L.LatLngBoundsExpression, padding: [number, number] = [50, 50]): void {
        this.map?.fitBounds(bounds, {
            padding: padding,
            maxZoom: 16,
            animate: true,
            duration: 1
        });
    }

    /**
     * Getter para exponer la instancia a otros servicios.
     * Ess necesario que sea público para que RouteLayer y MarkerLayer
     * puedan pintar sobre el mapa.
     */
    getMapInstance(): L.Map | null {
        return this.map;
    }

    private setupBaseEvents(): void {
        if (!this.map) return;

        // Captura el click en el mapa y lo emite como un evento limpio
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            this.mapClickSubject.next({
                lat: e.latlng.lat,
                lon: e.latlng.lng
            });
        });
    }
}
