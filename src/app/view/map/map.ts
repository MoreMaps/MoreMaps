import {
    AfterViewInit,
    Component,
    ElementRef,
    inject,
    OnInit,
    signal,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import {CommonModule} from '@angular/common';
import * as L from 'leaflet';
import {MapUpdateService} from '../../services/map-update-service/map-updater';
import {MatSnackBar, MatSnackBarModule, MatSnackBarRef} from '@angular/material/snack-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {Auth, authState} from '@angular/fire/auth';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {NavbarComponent} from '../navbar/navbar.component';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {ProfileButtonComponent, UserData} from '../profileButton/profileButton';
import {MapSearchService} from '../../services/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY} from '../../services/map-search-service/MapSearchRepository';
import {MapSearchAPI} from '../../services/map-search-service/MapSearchAPI';
import {POISearchModel} from '../../data/POISearchModel';
import {PoiDetailsDialog} from './poi-details-dialog/poi-details-dialog';
import {POIService} from '../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {ProfileMenuComponent} from './profile-menu.component/profile-menu.component';
import {Geohash, geohashForLocation} from 'geofire-common';
import {MatIcon} from '@angular/material/icon';
import {MatFabButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import {CoordsNotFoundError} from '../../errors/CoordsNotFoundError';

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

const selectedIcon = L.icon({
    iconUrl: 'assets/images/poi_active.png',
    iconSize: [27, 35],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
})

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
        NavbarComponent,
        ThemeToggleComponent,
        ProfileButtonComponent,
        MatIcon,
        MatFabButton,
        MatTooltip
    ],
    providers: [
        MapSearchService,
        POIService,
        {provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI},
        {provide: POI_REPOSITORY, useClass: POIDB},
    ],
})
export class LeafletMapComponent implements OnInit, AfterViewInit {
    @ViewChild('mapContainer') private mapContainer!: ElementRef<HTMLDivElement>;
    private router = inject(Router);
    private map: L.Map | null = null;
    protected listMarkers: L.Marker[] = [];
    protected currentMarker: L.Marker | null = null;
    protected currentPOI = signal<POISearchModel | null>(null);
    protected listPOIs = signal<POISearchModel[]>([]);
    protected currentIndex = signal<number>(-1);
    private snackBar = inject(MatSnackBar);
    private elementRef = inject(ElementRef);
    private userLocationMarker: L.Marker | null = null;
    private dialog = inject(MatDialog);
    private authSubscription: Subscription | null = null;
    private mapSearchService = inject(MapSearchService);
    private poiService = inject(POIService);
    private poiDialogRef: MatDialogRef<PoiDetailsDialog> | null = null
    private savedPOIs: Geohash[] = []
    private route = inject(ActivatedRoute);
    private shouldCenterOnLocation = true;

    // Referencia al snackbar de carga para poder cerrarlo
    private loadingSnackBarRef: MatSnackBarRef<any> | null = null;

    protected userData = signal<UserData>({
        fullName: '',
        email: '',
        profileImage: 'assets/images/pfp.png'
    });

    constructor(private mapUpdateService: MapUpdateService, private auth: Auth) {
    }

    async ngOnInit() {
        this.mapUpdateService.marker$.subscribe((marker: POISearchModel) => {
            this.selectPOI(new POISearchModel(marker.lat, marker.lon, marker.placeName));
        });

        this.mapUpdateService.snackbar$.subscribe((message: string) => {
            this.showSnackbar(message, 'Ok');
        });

        this.mapUpdateService.searchCoords$.subscribe((coords) => {
            console.info('Recibidas coordenadas externas:', coords);
            this.searchByCoords(coords.lat, coords.lon);
        });

        this.mapUpdateService.searchPlaceName$.subscribe((placeName) => {
            console.info('Recibido topónimo:', placeName);
            this.searchByPlaceName(placeName);
        });
    }

    ngAfterViewInit() {
        this.authSubscription = authState(this.auth).subscribe(async (user) => {
            if (user) {
                const mapContainer = this.elementRef.nativeElement.querySelector('#map');
                if (mapContainer && !this.map) {
                    if (!this.map) {
                        this.initMap();
                        this.handleInitialLocationLogic();
                    }

                }
                let currentList = await this.poiService.getPOIList(this.auth);
                for (const item of currentList) {
                    this.savedPOIs.push(item.geohash);
                }

            } else {
                console.warn("No hay sesión, redirigiendo...");
                await this.router.navigate(['']);
            }
        });
    }

    // Es buena práctica desuscribirse
    ngOnDestroy(): void {
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
        }
        if (this.poiDialogRef) {
            this.poiDialogRef.close({ignore: true});
        }
        if (this.loadingSnackBarRef) {
            this.loadingSnackBarRef.dismiss()
        }

        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }

    private initMap() {
        if (this.map) return; // extra prevention

        // Limit config
        const latBuffer = 50; // Grados extra de latitud
        const lonBuffer = 50; // Grados extra de longitud
        const southWest = L.latLng(-90 - latBuffer, -180 - lonBuffer);
        const northEast = L.latLng(90 + latBuffer, 180 + lonBuffer);
        const bounds = L.latLngBounds(southWest, northEast);

        // Initialize map
        this.map = L.map(this.mapContainer.nativeElement, {
            maxBounds: bounds,
            maxBoundsViscosity: 0.5, // permitir un rebote elástico
            zoomControl: false // Opcional: si quieres mover los controles de zoom
        });

        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        L.tileLayer(osmUrl, {
            maxZoom: 19,
            minZoom: 3,
            noWrap: true,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Make sure Leaflet recalculates the container's size
        this.map.whenReady(() => {
            setTimeout(() => {
                if (this.map) this.map.invalidateSize();
            }, 100);
        });

        this.setupMapClickHandler();
        this.setupLocationEventHandlers();
    }

    private handleInitialLocationLogic() {
        this.route.queryParams.subscribe(params => {
            const lat = params['lat'];
            const lon = params['lon'];
            const name = params['name'];

            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);

            // Si tengo longitud y latitud, significa que tengo que hacer una búsqueda
            const hasPoiParams = !isNaN(latNum) && !isNaN(lonNum);
            this.shouldCenterOnLocation = !hasPoiParams;

            if (this.mapUpdateService.lastKnownLocation) {
                this.handleLocationSuccess(this.mapUpdateService.lastKnownLocation);
            } else {
                this.startLocating();
            }

            // Cuando el mapa esté listo, empiezo la búsqueda
            this.map!.whenReady(() => {
                this.map!.invalidateSize();

                // si tengo lan y lon...
                if (hasPoiParams) {
                    console.info('Cargando mapa con coordenadas específicas:', lat, lon);
                    // si tengo nombre también, significa que estoy mirando un POI guardado
                    if (name) {
                        const savedPoi = new POISearchModel(latNum, lonNum, name);
                        this.selectPOI(savedPoi);
                    } else { // si no, es una búsqueda
                        console.log(latNum + ' - ' + lonNum);
                        this.searchByCoords(latNum, lonNum);
                    }
                } else {
                    // si no tengo lan y lon, pero tengo name, es búsqueda por topónimo
                    if (name) {
                        console.log(name);
                        this.searchByPlaceName(name);
                    }
                }
            })

        });
    }

    private setupLocationEventHandlers() {
        if (this.map) this.map.on('locationfound', (e: L.LocationEvent) => {
            this.mapUpdateService.lastKnownLocation = e.latlng;

            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            this.handleLocationSuccess(e.latlng);

            this.showSnackbar('Ubicación encontrada.', '¡Bien!');
        });

        if (this.map) this.map.on('locationerror', (e: L.ErrorEvent) => {
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
            if (this.map) this.map.removeLayer(this.userLocationMarker);
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
        }).addTo(this.map!);

        // 5. Centrar mapa
        if (this.map) this.map.setView(latlng, 15);
    }

    private startLocating() {
        this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
            duration: 0
        });

        if (this.map) this.map.locate({
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
        this.listMarkers!.forEach(marker => marker.remove());
        this.listMarkers = [];
    }

    private resetMapState(): void {
        // Borrando elementos visuales
        this.deleteCurrentMarker();
        this.deleteMarkers();

        // Borrando el estado interno
        this.listPOIs.set([]);
        this.currentIndex.set(-1);
        this.poiDialogRef = null;
    }

    private async updateSaved(): Promise<void> {
        this.savedPOIs = [];
        let currentList = await this.poiService.getPOIList(this.auth);
        for (const item of currentList) {
            this.savedPOIs.push(item.geohash);
        }
    }

    private addMarker(poi: POISearchModel): L.Marker {
        if (!this.map) throw new Error("El mapa no está inicializado");

        // 1. Solo crea y añade el marcador, NO mueve el mapa
        let marker = L.marker([poi.lat, poi.lon], {icon: customIcon})
            .addTo(this.map)
            .bindPopup("Encontrado: " + poi.placeName);

        // 2. Lo guardamos en el array local
        this.listMarkers!.push(marker);

        return marker;
    }

    private addListMarkers(list: POISearchModel[]): void {
        for (const marker of list) {
            this.addMarker(marker);
        }
    }

    private fitMapToMarkers(): void {

        if (!this.listMarkers || this.listMarkers.length === 0) return;

        // Caso 1: Solo hay un marcador
        if (this.listMarkers.length === 1) {
            const marker = this.listMarkers[0];
            if (this.map) this.map.flyTo(marker.getLatLng(), 16, {animate: true, duration: 1});
            marker.openPopup();
            return;
        }

        // Caso 2: Hay múltiples marcadores
        const group = L.featureGroup(this.listMarkers);

        // fitBounds hace el zoom automático para que quepan todos
        if (this.map) this.map.fitBounds(group.getBounds(), {
            padding: [50, 50], // Margen en píxeles alrededor de los marcadores
            maxZoom: 16,       // Evita que haga demasiado zoom si los puntos están muy cerca
            animate: true,
            duration: 1
        });
    }

    private showSnackbar(msg: string, action: string, geohash?: Geohash): void {
        const snackBarRef = this.snackBar.open(msg, action, {
            duration: 5000,
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
        });

        snackBarRef.onAction().subscribe(() => {
            switch (action) {
                case 'Ver':
                    snackBarRef.dismiss();
                    this.router.navigate(['/saved'], {queryParams: {type: 'lugares', id: geohash}});
                    break;
                default:
                    snackBarRef.dismiss();
            }
        });
    }

    async searchByCoords(lat: number, lon: number): Promise<void> {
        if (isNaN(lat) || isNaN(lon)) return;
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

            this.selectPOI(poiSearchResult);

        } catch (error: any) {
            // Manejo de errores
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            if (error instanceof CoordsNotFoundError) {
                // Caso: Coordenadas válidas (ej. 0,0) pero sin resultados (Océano)
                this.snackBar.open(
                    `No se encontró ninguna dirección en las coordenadas (${lat}, ${lon}).`,
                    'OK',
                    { duration: 5000 }
                );
            } else {
                // Caso: Error técnico (API caída, sin internet, etc.)
                const msg = error.message ? error.message : 'Error desconocido';
                this.snackBar.open(`Error al buscar: ${msg}`, 'Cerrar', { duration: 5000 });
            }
            console.error(`Error al buscar por coordenadas: ${error}`);
            this.snackBar.open(`Error al buscar: ${error.message}`, 'Cerrar', {duration: 5000});
        }
    }

    async searchByPlaceName(placeName: string): Promise<void> {
        try {
            // Mostrar spinner de carga
            this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                horizontalPosition: 'left',
                verticalPosition: 'bottom',
                duration: 0
            });

            // Realizar búsqueda en la API (Geocode Search)
            const poiSearchResult: POISearchModel[] = await this.mapSearchService.searchPOIByPlaceName(placeName);

            // Cerrar spinner de carga
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            this.selectPOI(poiSearchResult);

        } catch (error: any) {
            // Manejo de errores
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }
            console.error(`Error al buscar por topónimo: ${error}`);
            this.snackBar.open(`Error al buscar: ${error.message}`, 'Cerrar', {duration: 5000});
        }
    }

    private setupMapClickHandler(): void {
        if (this.map) this.map.on('click', async (e: L.LeafletMouseEvent) => {
            const lat = e.latlng.lat;
            const lon = e.latlng.lng;

            await this.searchByCoords(lat, lon);
        });
    }

    openPOIDetailsDialog(): void {
        // abrir el diálogo con información y botones
        this.poiDialogRef = this.dialog.open(PoiDetailsDialog, {
            position: {bottom: '20px', left: '20px'},
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
            data: {
                currentPOI: this.currentPOI(),
                totalPOIs: this.listPOIs().length,
                currentIndex: this.currentIndex(),
                savedPOIs: this.savedPOIs,
            },
        });

        // función cuando se pulsa el botón de guardar
        this.poiDialogRef.componentInstance.save.subscribe(() => {
            this.poiDialogRef!.close({savePOI: true});
        });

        // función cuando se pulsa el botón de siguiente POI
        this.poiDialogRef.componentInstance.next.subscribe(() => {
            this.goToNextPOI();
        });
        // función cuando se pulsa el botón de POI anterior
        this.poiDialogRef.componentInstance.prev.subscribe(() => {
            this.goToPreviousPOI();
        });

        // Suscribirse al cierre de diálogo si se va a registrar el POI
        this.poiDialogRef.afterClosed().subscribe(result => {
            if (result?.ignore) return;
            if (result?.savePOI && result.savePOI && this.currentPOI()) {
                // llamada a guardar POI del poiService
                let curPOI = <POISearchModel>this.currentPOI();
                this.poiService.createPOI(curPOI);
                let lat = curPOI.lat;
                let lon = curPOI.lon;
                let geohash = geohashForLocation([lat, lon], 7);
                this.resetMapState();
                this.updateSaved();
                this.showSnackbar('El punto de interés se ha guardado correctamente.', 'Ver', geohash);
            } else {
                console.info('Cerrando el diálogo sin guardar...')
                this.resetMapState();
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

    private goToPOIIndex(index: number): void {
        const list = this.listPOIs();
        if (!list.length || index < 0 || index >= list.length) return;

        const nextPoi = list[index];
        this.currentIndex.set(index);
        this.currentPOI.set(nextPoi);

        this.highlightMarker(index);

        if (this.poiDialogRef && this.poiDialogRef.componentInstance) {
            this.poiDialogRef.componentInstance.updatePOI(nextPoi, index, this.savedPOIs);
        }

        if (this.map) this.map.panTo([nextPoi.lat, nextPoi.lon], {animate: true, duration: 0.5});
    }

    public goToPreviousPOI(): void {
        this.currentIndex.set((this.currentIndex() - 1 + this.listPOIs().length) % this.listPOIs().length);
        this.goToPOIIndex(this.currentIndex());
    }

    public goToNextPOI(): void {
        this.currentIndex.set((this.currentIndex() + 1) % this.listPOIs().length);
        this.goToPOIIndex(this.currentIndex());
    }

    private selectPOI(poi: POISearchModel | POISearchModel[]): void {
        // 1. Limpiar estado anterior
        this.deleteCurrentMarker();
        this.deleteMarkers();
        this.closePOIDetailsDialog();

        const isList = Array.isArray(poi);
        const newData = isList ? poi : [poi];

        // 2. Actualizar estado interno
        this.listPOIs.set(newData)
        this.currentIndex.set(0);
        this.currentPOI.set(newData[0]);

        // 3. Gestión de Marcadores
        if (isList) {
            // Si es una lista, añadimos TODOS los marcadores al mapa
            this.addListMarkers(newData); // usa customicon internamente
            this.currentMarker = this.listMarkers![0];
        } else {
            // Si es único, añadimos solo ese
            this.currentMarker = this.addMarker(poi as POISearchModel);
        }

        this.highlightMarker(0);

        // 4. Ajustar el zoom una sola vez, al final
        this.fitMapToMarkers();

        // 5. Abrir diálogo
        this.openPOIDetailsDialog();
    }

    public centerOnUser(): void {
        if (!this.map) return;

        if (this.userLocationMarker) {
            this.map.flyTo(this.userLocationMarker.getLatLng(), 16, {
                animate: true,
                duration: 1
            });
        } else if (this.mapUpdateService.lastKnownLocation) {
            this.map.flyTo(this.mapUpdateService.lastKnownLocation, 16);
        } else {
            this.startLocating();
        }
    }

    public refreshLocation(): void {
        this.startLocating();
    }

    private highlightMarker(index: number): void {
        if (!this.listMarkers || this.listMarkers.length === 0) return;

        // 1. Resetear TODOS los marcadores al estado normal
        this.listMarkers.forEach(marker => {
            marker.setIcon(customIcon);
            marker.setZIndexOffset(0);
        });

        const activeMarker = this.listMarkers[index];
        if (activeMarker) {
            activeMarker.setIcon(selectedIcon);
            activeMarker.setZIndexOffset(700);
        }
        activeMarker.openPopup();
    }
}
