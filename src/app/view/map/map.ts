import { Component, OnInit, AfterViewInit, inject, ElementRef, ViewEncapsulation } from '@angular/core';
import * as L from 'leaflet';
import { MapMarker, MapUpdateService } from '../../services/map-update-service/map-updater';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// --- MINI-COMPONENTE SPINNER ---
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
export class SpinnerSnackComponent {}

const customIcon = L.icon({
    iconUrl: 'image_0.png', // Asegúrate de que esta ruta sea correcta en tu proyecto
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -25]
});

@Component({
    selector: 'app-map',
    templateUrl: './map.html',
    styleUrl: './map.scss',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [MatSnackBarModule, MatProgressSpinnerModule]
})
export class LeafletMapComponent implements OnInit, AfterViewInit {
    private map!: L.Map;
    protected currentMarker: L.Marker | null = null;
    private snackBar = inject(MatSnackBar);
    private elementRef = inject(ElementRef);
    private userLocationMarker: L.Marker | null = null;

    // Referencia al snackbar de carga para poder cerrarlo
    private loadingSnackBarRef: MatSnackBarRef<any> | null = null;

    constructor(private mapUpdateService: MapUpdateService) {}

    ngOnInit() {

        this.mapUpdateService.marker$.subscribe((marker: MapMarker) => {
            this.addMarker(marker.lat, marker.lon, marker.name);
            this.map.setView([marker.lat, marker.lon], 14);
        });
        this.mapUpdateService.snackbar$.subscribe((message: string) => {
            this.showSnackbar(message);
        });
    }

    ngAfterViewInit() {
        const mapContainer = this.elementRef.nativeElement.querySelector('#map');
        if (mapContainer) {
            this.initMap();
            // 1. Primero configuramos los eventos (qué pasa si encuentro/fallo)
            this.setupLocationEventHandlers();
            // 2. Luego iniciamos la búsqueda
            this.startLocating();
        }
    }

    private initMap() {
        const baseMapURl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        this.map = L.map('map').setView([39.9864, -0.0513], 6);

        L.tileLayer(baseMapURl, {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.map.whenReady(() => {
            this.map.invalidateSize();
        });
    }

    // Configura los listeners una sola vez para evitar duplicados al reintentar
    private setupLocationEventHandlers() {
        this.map.on('locationfound', (e: L.LocationEvent) => {
            // Cerrar spinner
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            console.log('Location found:', e.latlng);

            if (this.userLocationMarker) {
                this.map.removeLayer(this.userLocationMarker);
            }

            const pulsingIcon = L.divIcon({
                className: 'pulsing-beacon',
                html: '<div class="beacon-core"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            this.userLocationMarker = L.marker(e.latlng, {
                icon: pulsingIcon,
                zIndexOffset: 1000
            }).addTo(this.map);

            this.map.setView(e.latlng, 15);
            this.showSnackbar('Ubicación encontrada');
        });

        this.map.on('locationerror', (e: L.ErrorEvent) => {
            // Cerrar spinner
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            console.error('Location error:', e);

            // Lógica de Reintentar
            const snackRef = this.snackBar.open(
                'Error al obtener ubicación: ' + e.message,
                'Reintentar', // Texto del botón de acción
                {
                    duration: 10000, // Damos más tiempo para leer y clicar
                    horizontalPosition: 'left',
                    verticalPosition: 'bottom',
                }
            );

            // Si el usuario pulsa "Reintentar"
            snackRef.onAction().subscribe(() => {
                this.startLocating(); // Volvemos a llamar a la función de inicio
            });
        });
    }

    // Función auxiliar para iniciar la búsqueda (llamada al inicio y al reintentar)
    private startLocating() {
        // Mostrar spinner
        this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
            duration: 0
        });

        // Iniciar búsqueda en Leaflet
        this.map.locate({
            setView: false,
            maxZoom: 16,
            watch: false,
            enableHighAccuracy: true,
            timeout: 10000
        });
    }

    private addMarker(lat: number, lng: number, name: string): void {
        if (this.currentMarker) {
            this.map.removeLayer(this.currentMarker);
        }

        this.currentMarker = L.marker([lat, lng], { icon: customIcon })
            .addTo(this.map)
            .bindPopup("Encontrado: " + name)
            .openPopup();
    }

    private showSnackbar(msg: string): void {
        this.snackBar.open(msg, 'Ok', {
            duration: 5000,
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
        });
    }
}
