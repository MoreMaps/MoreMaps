import {AfterViewInit, Component, ElementRef, inject, OnInit, ViewEncapsulation} from '@angular/core';
import {CommonModule} from '@angular/common';
import * as L from 'leaflet';
import {MapMarker, MapUpdateService} from '../../services/map-update-service/map-updater';
import {MatSnackBar, MatSnackBarModule, MatSnackBarRef} from '@angular/material/snack-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatDialogModule} from '@angular/material/dialog';
import {Auth, authState} from '@angular/fire/auth';
import {Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {NavbarComponent} from '../navbar/navbar.component';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {ProfileButtonComponent} from '../profileButton/profileButton';

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
export class SpinnerSnackComponent {
}

const customIcon = L.icon({
    iconUrl: 'image_0.png',
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
    imports: [CommonModule, MatSnackBarModule, MatProgressSpinnerModule, MatDialogModule, NavbarComponent, ThemeToggleComponent, ProfileButtonComponent],
})
export class LeafletMapComponent implements OnInit, AfterViewInit {
    private router = inject(Router);
    private map!: L.Map;
    protected currentMarker: L.Marker | null = null;
    private snackBar = inject(MatSnackBar);
    private elementRef = inject(ElementRef);
    private userLocationMarker: L.Marker | null = null;
    private auth = inject(Auth);
    private authSubscription: Subscription | null = null;

    // Referencia al snackbar de carga para poder cerrarlo
    private loadingSnackBarRef: MatSnackBarRef<any> | null = null;

    constructor(private mapUpdateService: MapUpdateService) {
    }

    async ngOnInit() {
        this.authSubscription = authState(this.auth).subscribe(async (user) => {
            if (user) {
                const mapContainer = this.elementRef.nativeElement.querySelector('#map');
                if (mapContainer && !this.map) {
                    this.initMap();
                    this.setupLocationEventHandlers();

                    if (this.mapUpdateService.lastKnownLocation) {
                        console.log('Finding location by cache');
                        this.handleLocationSuccess(this.mapUpdateService.lastKnownLocation);
                    } else {console.log('Finding location by API');this.startLocating();}
                }
            } else {
                console.warn("No hay sesión, redirigiendo...");
                this.router.navigate(['']);
            }
        });

        this.mapUpdateService.marker$.subscribe((marker: MapMarker) => {
            this.addMarker(marker.lat, marker.lon, marker.name);
            if (this.map) this.map.setView([marker.lat, marker.lon], 14);
        });
        this.mapUpdateService.snackbar$.subscribe((message: string) => {
            this.showSnackbar(message);
        });
    }

    // Es buena práctica desuscribirse
    ngOnDestroy() {
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
        }
    }

    ngAfterViewInit() {  }

    private initMap() {
        // Standard OpenStreetMap URL
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        this.map = L.map('map').setView([39.9864, -0.0513], 6);

        this.map.whenReady(() => {
            this.map.invalidateSize();
        });

        L.tileLayer(osmUrl, {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    private setupLocationEventHandlers() {
        this.map.on('locationfound', (e: L.LocationEvent) => {
            this.mapUpdateService.lastKnownLocation = e.latlng;

            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            this.handleLocationSuccess(e.latlng);

            this.showSnackbar('Ubicación encontrada');
        });

        this.map.on('locationerror', (e: L.ErrorEvent) => {
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            console.error('Location error:', e);

            const snackRef = this.snackBar.open(
                'Error al obtener ubicación: ' + e.message,
                'Reintentar',
                {
                    duration: 10000,
                    horizontalPosition: 'left',
                    verticalPosition: 'bottom',
                }
            );

            snackRef.onAction().subscribe(() => {
                this.startLocating();
            });
        });
    }

    private handleLocationSuccess(latlng: L.LatLng) {
        // 1. Cerrar spinner si estaba abierto
        if (this.loadingSnackBarRef) {
            this.loadingSnackBarRef.dismiss();
        }

        // 2. Limpiar marcador anterior
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
        }

        // 3. Crear icono
        const pulsingIcon = L.divIcon({
            className: 'pulsing-beacon',
            html: '<div class="beacon-core"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            popupAnchor: [0, -10]
        });

        // 4. Poner marcador
        this.userLocationMarker = L.marker(latlng, {
            icon: pulsingIcon,
            zIndexOffset: 1000
        }).addTo(this.map);

        // 5. Centrar mapa
        this.map.setView(latlng, 15);
    }

    private startLocating() {
        this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
            duration: 0
        });

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

        this.currentMarker = L.marker([lat, lng], {icon: customIcon})
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
