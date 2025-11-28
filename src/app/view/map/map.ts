import {AfterViewInit, Component, ElementRef, inject, OnInit, signal, ViewEncapsulation} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import * as L from 'leaflet';
import {MapMarker, MapUpdateService} from '../../services/map-update-service/map-updater';
import {MatSnackBar, MatSnackBarModule, MatSnackBarRef} from '@angular/material/snack-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {ProfileMenuComponent} from './profile-menu.component/profile-menu.component';
import {doc, Firestore, getDoc} from '@angular/fire/firestore';
import {Auth, authState} from '@angular/fire/auth';
import {Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {NavbarComponent} from '../navbar/navbar.component';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import { MapSearchService } from '../../services/map-search-service/map-search.service';
import { MAP_SEARCH_REPOSITORY } from '../../services/map-search-service/MapSearchRepository';
import { MapSearchAPI } from '../../services/map-search-service/MapSearchAPI';

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
    iconUrl: 'assets/images/poi/customMarker.png',
    iconSize: [27, 35],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

export interface UserData {
    fullName: string;
    email: string;
    profileImage: string;
}

@Component({
    selector: 'app-map',
    templateUrl: './map.html',
    styleUrl: './map.scss',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        NgOptimizedImage,
        NavbarComponent,
        ThemeToggleComponent,
    ],
    providers: [
        MapSearchService,
        { provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI }
    ],
})
export class LeafletMapComponent implements OnInit, AfterViewInit {
    private router = inject(Router);
    private map!: L.Map;
    protected currentMarker: L.Marker | null = null;
    private snackBar = inject(MatSnackBar);
    private elementRef = inject(ElementRef);
    private userLocationMarker: L.Marker | null = null;
    private dialog = inject(MatDialog);
    private authSubscription: Subscription | null = null;
    private mapSearchService = inject(MapSearchService);

    // Referencia al snackbar de carga para poder cerrarlo
    private loadingSnackBarRef: MatSnackBarRef<any> | null = null;

    // Signal for user data
    userData = signal<UserData>({
        fullName: '',
        email: '',
        profileImage: 'assets/images/pfp.png'
    });

    constructor(private mapUpdateService: MapUpdateService, private firestore: Firestore, private auth: Auth ) {
    }

    async ngOnInit() {

        this.authSubscription = authState(this.auth).subscribe(async (user) => {
            if (user) {
                // El usuario existe, cargamos sus datos
                await this.loadUserData();

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
            if (this.map) {
                this.map.panTo([marker.lat, marker.lon]);
            }
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

    private async loadUserData(): Promise<void> {
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            const userDoc = doc(this.firestore, `users/${user.uid}`);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.userData.set({
                    fullName: `${data['nombre'] || ''} ${data['apellidos'] || ''}`.trim(),
                    email: data['email'] || user.email || '',
                    profileImage: 'assets/images/pfp.png'
                });
            } else {
                this.userData.set({
                    fullName: '',
                    email: user.email || '',
                    profileImage: 'assets/images/pfp.png'
                });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.userData.set({
                fullName: '',
                email: user.email || '',
                profileImage: 'assets/images/pfp.png'
            });
        }
    }

    private initMap() {
        // Standard OpenStreetMap URL
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const southWest = L.latLng(-90, -180);
        const northEast = L.latLng(90, 180);
        const bounds = L.latLngBounds(southWest, northEast);

        this.map = L.map('map', {
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
        });

        this.map.whenReady(() => {
            this.map.invalidateSize();
        });

        L.tileLayer(osmUrl, {
            maxZoom: 19,
            minZoom: 3,
            noWrap: true,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.setupMapClickHandler();
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

    private setupMapClickHandler(): void {
        this.map.on('click', async (e: L.LeafletMouseEvent) => {
            const lat = e.latlng.lat;
            const lon = e.latlng.lng;

            console.log(`Click en coordenadas: ${lat}, ${lon}`);

            try {
                // Mostrar spinner mientras se busca
                this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                    horizontalPosition: 'left',
                    verticalPosition: 'bottom',
                    duration: 0
                });

                // Realizar búsqueda por coordenadas
                const poiSearchResult = await this.mapSearchService.searchPOIByCoords(lat, lon);

                // Cerrar spinner
                if (this.loadingSnackBarRef) {
                    this.loadingSnackBarRef.dismiss();
                }

                // Mostrar el POI en el mapa
                this.addMarker(poiSearchResult.lat, poiSearchResult.lon, poiSearchResult.placeName);

                // Mostrar notificación
                this.showSnackbar(`Lugar encontrado: ${poiSearchResult.placeName}`);

                // Opcional: Emitir evento para que otros componentes sepan del nuevo POI
                this.mapUpdateService.sendMarker({
                    name: poiSearchResult.placeName,
                    lat: poiSearchResult.lat,
                    lon: poiSearchResult.lon
                });

            } catch (error: any) {
                // Cerrar spinner si hay error
                if (this.loadingSnackBarRef) {
                    this.loadingSnackBarRef.dismiss();
                }

                console.error('Error al buscar POI: ', error);

                const snackRef = this.snackBar.open(
                    `Error al buscar: ${error.message}`,
                    'Reintentar',
                    {
                        duration: 5000,
                        horizontalPosition: 'left',
                        verticalPosition: 'bottom',
                    }
                );

                snackRef.onAction().subscribe(() => {
                    // Reintentar al hacer click
                    this.setupMapClickHandler();
                });
            }
        });
    }

    // Open profile menu with preloaded user data
    openProfileMenu(): void {
        this.dialog.open(ProfileMenuComponent, {
            backdropClass: 'transparent-backdrop',
            hasBackdrop: true,
            panelClass: 'profile-menu-dialog',

            position: { top: '16px', right: '16px' },

            maxWidth: 'none',
            enterAnimationDuration: '200ms',
            exitAnimationDuration: '200ms',
            data: this.userData()
        });
    }
}
