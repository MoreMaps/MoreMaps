import {AfterViewInit, Component, ElementRef, inject, OnInit, OnDestroy, signal, ViewEncapsulation} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import * as L from 'leaflet';
import {MapUpdateService} from '../../services/map-update-service/map-updater';
import {MatSnackBar, MatSnackBarModule, MatSnackBarRef} from '@angular/material/snack-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatDialogModule} from '@angular/material/dialog';
import {Auth, authState} from '@angular/fire/auth';
import {Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {NavbarComponent} from '../navbar/navbar.component';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {MapSearchService} from '../../services/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY} from '../../services/map-search-service/MapSearchRepository';
import {MapSearchAPI} from '../../services/map-search-service/MapSearchAPI';
import {POISearchModel} from '../../data/POISearchModel';
import {PoiDetailsDialog} from './poi-details-dialog/poi-details-dialog';
import {POIService} from '../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';

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
        ProfileButtonComponent
    ],
    providers: [
        MapSearchService,
        POIService,
        {provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI},
        {provide: POI_REPOSITORY, useClass: POIDB},
    ],
})
export class LeafletMapComponent implements OnInit, AfterViewInit {
    private router = inject(Router);
    private map!: L.Map;
    protected listMarkers: L.Marker[] | null = null;
    protected currentMarker: L.Marker | null = null;
    protected currentPOI = signal<POISearchModel | null>(null);
    private snackBar = inject(MatSnackBar);
    private elementRef = inject(ElementRef);
    private userLocationMarker: L.Marker | null = null;
    private dialog = inject(MatDialog);
    private authSubscription: Subscription | null = null;
    private mapSearchService = inject(MapSearchService);
    private poiService = inject(POIService);

    // Referencia al snackbar de carga para poder cerrarlo
    private loadingSnackBarRef: MatSnackBarRef<any> | null = null;

    // Signal for user data
    userData = signal<UserData>({
        fullName: '',
        email: '',
        profileImage: 'assets/images/pfp.png'
    });

    constructor(private mapUpdateService: MapUpdateService, private firestore: Firestore, private auth: Auth) {
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
                    } else {
                        console.log('Finding location by API');
                        this.startLocating();
                    }
                }
            } else {
                console.warn("No hay sesión, redirigiendo...");
                await this.router.navigate(['']);
            }
        });

        this.mapUpdateService.marker$.subscribe((marker: POISearchModel) => {
            this.addMarker(new POISearchModel(marker.lat, marker.lon, marker.placeName));
            if (this.map) {
                this.map.panTo([marker.lat, marker.lon]);
            }
        });
        this.mapUpdateService.snackbar$.subscribe((message: string) => {
            this.showSnackbar(message);
        });

        this.mapUpdateService.searchCoords$.subscribe((coords) => {
            console.log('Recibidas coordenadas externas:', coords);
            this.searchByCoords(coords.lat, coords.lon);
        });
    }

    ngAfterViewInit() {
    }

    // Es buena práctica desuscribirse
    ngOnDestroy(): void {
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
        }
    }

    ngAfterViewInit() {  }

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

    private deleteCurrentMarker(): void {
        if (this.currentMarker) {
            this.currentMarker.remove();
            this.currentMarker = null;
        }
        if (this.currentPOI()) {
            this.currentPOI.set(null);
        }
    }

    private deleteMarkers(): void {
        if (this.listMarkers) {
            for (const item of this.listMarkers) {
                this.map.removeLayer(item);
            }
            this.listMarkers = [];
        }
    }

    private addListMarkers(list: POISearchModel[]): void {
        for (const marker of list) this.addMarker(marker);
    }

    private addMarker(poi: POISearchModel): L.Marker {
        let marker = L.marker([poi.lat, poi.lon], {icon: customIcon})
            .addTo(this.map)
            .bindPopup("Encontrado: " + poi.placeName)
            .openPopup();
        this.listMarkers?.push(marker);
        if (this.map) {
            this.map.flyTo([poi.lat, poi.lon], this.map.getZoom(), {animate: true, duration: 0.8});
        }
        return marker;
    }

    private showSnackbar(msg: string): void {
        this.snackBar.open(msg, 'Ok', {
            duration: 5000,
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
        });
    }

    async searchByCoords(lat: number, lon: number): Promise<void> {
        try {
            // Mostrar spinner de carga
            this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                horizontalPosition: 'left',
                verticalPosition: 'bottom',
                duration: 0
            });

            // Realizar búsqueda en la API (Reverse Geocoding)
            const poiSearchResult: POISearchModel = await this.mapSearchService.searchPOIByCoords(lat, lon);

            // Cerrar spinner de carga
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            // Limpiar estado anterior
            this.deleteCurrentMarker();
            this.closePOIDetailsDialog();

            // Actualizar mapa y estado
            this.currentMarker = this.addMarker(poiSearchResult);
            this.currentPOI.set(poiSearchResult);

            // Abrir diálogo de detalles
            this.openPOIDetailsDialog();

        } catch (error: any) {
            // Manejo de errores
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }
            console.error(`Error al buscar por coordenadas: ${error}`);
            this.snackBar.open(`Error al buscar: ${error.message}`, 'Cerrar', { duration: 5000 });
        }
    }

    private setupMapClickHandler(): void {
        this.map.on('click', async (e: L.LeafletMouseEvent) => {
            const lat = e.latlng.lat;
            const lon = e.latlng.lng;

            // todo: borrar log
            console.log(`Click en coordenadas: ${lat}, ${lon}`);

            await this.searchByCoords(lat, lon);
        });
    }

    openPOIDetailsDialog(): void {
        // todo: esconder el navbar (añadir clase o estilo display:none)

        // abrir el diálogo con información y botones
        const dialogRef = this.dialog.open(PoiDetailsDialog, {
            position: {bottom: '20px'},
            width: '50vw',
            maxWidth: '500px',
            height: 'auto',
            maxHeight: '15vh',
            hasBackdrop: false,                   // que no oscurezca la pantalla
            disableClose: true,                   // no se puede borrar presionando fuera
            autoFocus: true,
            restoreFocus: true,
            enterAnimationDuration: '300ms',
            exitAnimationDuration: '200ms',
            data: this.currentPOI()
        });

        // función cuando se pulsa el botón de guardar
        dialogRef.componentInstance.save.subscribe(() => {
            dialogRef.close({savePOI: true});
        });

        // Subscribe to dialog close to check if registration was successful
        dialogRef.afterClosed().subscribe(result => {
            if (result?.savePOI && result.savePOI && this.currentPOI()) {
                // Llamada a guardar POI del poiService
                this.poiService.createPOI(<POISearchModel>this.currentPOI()).then();
                // si la busqueda tiene un elemento, se borra ese elemento.
                this.deleteCurrentMarker();
                // si tiene varios elementos, se deben borrar también
                this.deleteMarkers();
                // TODO en integración, snackbar de confirmación
            } else if (result?.ignore) {
            } else {
                // si la busqueda tiene un elemento, se borra ese elemento.
                this.deleteCurrentMarker();
                // si tiene varios elementos, se deben borrar también
                this.deleteMarkers();
            }
        });
    }

    closePOIDetailsDialog(): void {
        const openDialogArray = this.dialog.openDialogs;
        openDialogArray.at(0)?.close({ignore: true});
    }

    // Open profile menu with preloaded user data
    openProfileMenu(): void {
        this.dialog.open(ProfileMenuComponent, {
            backdropClass: 'transparent-backdrop',
            hasBackdrop: true,
            panelClass: 'profile-menu-dialog',

            position: {top: '16px', right: '16px'},

            maxWidth: 'none',
            enterAnimationDuration: '200ms',
            exitAnimationDuration: '200ms',
            data: this.userData()
        });
    }
}
