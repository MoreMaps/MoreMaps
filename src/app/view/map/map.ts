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
import {RouteDetailsDialog} from '../route/route-details-dialog/routeDetailsDialog';
import {RouteResultModel} from '../../data/RouteResultModel';
import {RouteService} from '../../services/Route/route.service';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';

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
        MatTooltip,
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
    private routeLayer: L.GeoJSON | null = null;
    private routeDialogRef: MatDialogRef<RouteDetailsDialog> | null = null;
    private routeService = inject(RouteService);
    private routeStartMarker: L.Marker | null = null;
    private routeEndMarker: L.Marker | null = null;

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
           if (this.routeLayer) {
               this.showSnackbar('Cierra la ruta actual para realizar nuevas búsquedas.', 'OK');
               return;
           }
            console.info('Recibidas coordenadas externas:', coords);
            this.searchByCoords(coords.lat, coords.lon);
        });

        this.mapUpdateService.searchPlaceName$.subscribe((placeName) => {
            if (this.routeLayer) {
                this.showSnackbar('Cierra la ruta actual para realizar nuevas búsquedas.', 'OK');
                return;
            }

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
                let currentList = await this.poiService.getPOIList();
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
        this.route.queryParams.subscribe(async params => {
            console.log(params);
            const mode = params['mode'];

            if (mode === 'route') {
                const startHash = params['start'];
                const endHash = params['end'];
                const startName = params['startName'];
                const endName = params['endName'];
                const transport = params['transport'];
                const preference = params['preference'];
                const matricula = params['matricula']; // opcional

                if (startHash && endHash) {
                    await this.calculateAndDrawRoute(
                        startHash, endHash, startName, endName,
                        transport, preference, matricula
                    );
                    return;
                }
                console.warn("Faltan parámetros de ruta, cargando mapa estándar...")
            }

            const lat = params['lat'];
            const lon = params['lon'];
            const name = params['name'];

            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);

            // Si tengo longitud y latitud, significa que tengo que hacer una búsqueda
            const hasCoords = !isNaN(latNum) && !isNaN(lonNum);
            const hasPoiParams = hasCoords || !!name;

            this.shouldCenterOnLocation = !hasPoiParams;

            if (!this.userLocationMarker && !this.mapUpdateService.lastKnownLocation)
                this.startLocating()
            else if (this.shouldCenterOnLocation && this.mapUpdateService.lastKnownLocation)
                this.handleLocationSuccess(this.mapUpdateService.lastKnownLocation);

            if (this.shouldCenterOnLocation) {
                if (this.mapUpdateService.lastKnownLocation) {
                    this.handleLocationSuccess(this.mapUpdateService.lastKnownLocation);
                } else {
                    this.startLocating();
                }
            }
            // Cuando el mapa esté listo, empiezo la búsqueda
            if (this.map) {
                this.map!.invalidateSize();
                // si tengo lan y lon...
                if (hasCoords) {
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
            }
        });
    }

    async calculateAndDrawRoute(
        startHash: string, endHash: string,
        startName: string, endName: string,
        transport: string, preference: string,
        matricula?: string
    ) {
        try {
            this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                horizontalPosition: 'left', verticalPosition: 'bottom', duration: 0
            });


            // 1. Llamada a API y obtener datos
            const result: RouteResultModel = await this.mapSearchService.searchRoute(
                startHash, endHash, transport as TIPO_TRANSPORTE, preference as PREFERENCIA
            );
            const coste = await this.routeService.getRouteCost(result, transport as TIPO_TRANSPORTE);

            if (this.loadingSnackBarRef) this.loadingSnackBarRef.dismiss();

            // 2. Limpiar mapa
            this.resetMapState();
            this.clearRouteMarkers();

            // 3. Pintar Marcadores Inicio y Fin
            // Necesitamos decodificar el geohash para poner el marker
            const startCoords = this.decodeGeohash(startHash); // [lat, lon]
            const endCoords = this.decodeGeohash(endHash);     // [lat, lon]

            // Marcador A (Origen)
            this.routeStartMarker = L.marker([startCoords[1], startCoords[0]], {
                icon: customIcon // O usa un icono diferente para origen
            }).addTo(this.map!).bindPopup(`Origen: ${startName}`);

            // Marcador B (Destino)
            this.routeEndMarker = L.marker([endCoords[1], endCoords[0]], {
                icon: selectedIcon // Icono destacado para destino
            }).addTo(this.map!).bindPopup(`Destino: ${endName}`);

            // 4. Pintar Geometría de Ruta
            if (result.geometry) {
                this.drawRouteGeometry(result.geometry);
            }

            // 5. Abrir Diálogo de Detalles
            this.openRouteDetailsDialog(result, startName, endName, transport, matricula, coste);

        } catch (e) {
            if (this.loadingSnackBarRef) this.loadingSnackBarRef.dismiss();
            this.showSnackbar('Error calculando la ruta', 'Cerrar');
            console.error(e);
        }
    }

    private drawRouteGeometry(geometry: any) {
        if (this.routeLayer) this.map?.removeLayer(this.routeLayer);

        this.routeLayer = L.geoJSON(geometry, {
            style: {
                color: '#FF9539', // Naranja corporativo
                weight: 6,
                opacity: 0.9,
                lineJoin: 'round',
                lineCap: 'round'
            }
        }).addTo(this.map!);

        // Ajustar zoom a la ruta
        this.map?.fitBounds(this.routeLayer.getBounds(), { padding: [50, 200] }); // Más padding abajo para el diálogo
    }

    private openRouteDetailsDialog(
        routeResult: RouteResultModel,
        startName: string, endName: string,
        transport: any, matricula?: string,
        coste: number = 0
    ){
        // Cerrar otros diálogos
        this.closePOIDetailsDialog();

        this.routeDialogRef = this.dialog.open(RouteDetailsDialog, {
            position: { bottom: '30px', right: '30px' },
            width: '90vw',
            maxWidth: '400px', // Estrecho como tarjeta
            hasBackdrop: false, // Permitir interactuar con el mapa
            panelClass: 'route-dialog-panel', // Para quitar estilos por defecto si hace falta
            data: {
                origenName: startName,
                destinoName: endName,
                transporte: transport,
                routeResult: routeResult,
                matricula: matricula,
                // TODO: Calcular coste real en RouteService
                coste: 0
            }
        });

        // Manejar cierre
        this.routeDialogRef.componentInstance.closeRoute.subscribe(() => {
            this.clearRoute();
        });

        // Manejar guardar
        this.routeDialogRef.componentInstance.save.subscribe(() => {
            // Implementar lógica de guardado
            this.showSnackbar('Ruta guardada (Simulación)', 'OK');
        });
    }

    private clearRoute() {
        if (this.routeLayer) {
            this.map?.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }

        // Borrar marcaderos específicos de ruta
        this.clearRouteMarkers();

        // Borrar marcadores generales
        this.deleteMarkers();

        // Volver a centrar en usuario
        // this.centerOnUser();

        // Limpiar URL
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {}
        });
    }

    private clearRouteMarkers() {
        if (this.routeStartMarker) {
            this.routeStartMarker.remove();
            this.routeStartMarker = null;
        }
        if (this.routeEndMarker) {
            this.routeEndMarker.remove();
            this.routeEndMarker = null;
        }
    }

    private setupLocationEventHandlers() {
        if (this.map) this.map.on('locationfound', (e: L.LocationEvent) => {
            this.mapUpdateService.lastKnownLocation = e.latlng;

            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            this.handleLocationSuccess(e.latlng);
            if (this.shouldCenterOnLocation && this.loadingSnackBarRef) {
                this.showSnackbar('Ubicación encontrada.', '¡Bien!');
            }
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
        // 1. SIEMPRE actualizamos/creamos el marcador de posición del usuario
        if (this.userLocationMarker) {
            this.userLocationMarker.setLatLng(latlng);
        } else {
            // Crear icono
            const pulsingIcon = L.divIcon({
                className: 'pulsing-beacon',
                html: '<div class="beacon-core"></div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
                popupAnchor: [0, -10]
            });

            this.userLocationMarker = L.marker(latlng, {
                icon: pulsingIcon,
                zIndexOffset: 1000 // Asegurar que esté por encima de otros
            }).addTo(this.map!);
        }

        // 2. SOLO centramos el mapa si el usuario NO está buscando otra cosa
        if (this.shouldCenterOnLocation) {
            // Cerrar spinner solo si era el de "Localizando..."
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }
            if (this.map) this.map.setView(latlng, 15);
        }
    }

    private startLocating() {
        if (this.shouldCenterOnLocation)
            this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
            duration: 0
            });

        if (this.map) this.map.locate({
            setView: false,
            maxZoom: 16,
            watch: true,
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
        let currentList = await this.poiService.getPOIList();
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
        if (this.loadingSnackBarRef) this.loadingSnackBarRef.dismiss();

        try {
            // Mostrar spinner de carga
            this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                horizontalPosition: 'left',
                verticalPosition: 'bottom',
                duration: 0
            });

            // Realizar búsqueda en la API (Geocode Search)
            const poiSearchResult: POISearchModel[] = await this.mapSearchService.searchPOIByPlaceName(placeName);

            this.selectPOI(poiSearchResult);

        } catch (error: any) {
            // Manejo de errores
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }
            console.error(`Error al buscar por topónimo: ${error}`);
            this.snackBar.open(`Error al buscar: ${error.message}`, 'Cerrar', {duration: 5000});
        } finally {
            // Cerrar spinner de carga
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
                this.loadingSnackBarRef = null;
            }
        }
    }

    private setupMapClickHandler(): void {
        if (this.map) this.map.on('click', async (e: L.LeafletMouseEvent) => {

            if (this.routeLayer) return;

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
        this.router.navigate(['/map'], {queryParams: {}});
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

    /**
     * Decodifica un Geohash directamente a [Lon., Lat.]
     * Formato compatible con OpenRouteService
     */
    decodeGeohash(geohash: string): [number, number] {
        const BITS = [16, 8, 4, 2, 1];
        const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
        let is_even = true;
        let lat = [-90.0, 90.0];
        let lon = [-180.0, 180.0];
        let lat_err = 90.0;
        let lon_err = 180.0;

        for (let i = 0; i < geohash.length; i++) {
            const c = geohash[i];
            const cd = BASE32.indexOf(c);
            for (let j = 0; j < 5; j++) {
                const mask = BITS[j];
                if (is_even) {
                    lon_err /= 2;
                    if (cd & mask) {
                        lon[0] = (lon[0] + lon[1]) / 2;
                    } else {
                        lon[1] = (lon[0] + lon[1]) / 2;
                    }
                } else {
                    lat_err /= 2;
                    if (cd & mask) {
                        lat[0] = (lat[0] + lat[1]) / 2;
                    } else {
                        lat[1] = (lat[0] + lat[1]) / 2;
                    }
                }
                is_even = !is_even;
            }
        }
        // Devolvemos [Longitud, Latitud]
        return [(lon[0] + lon[1]) / 2, (lat[0] + lat[1]) / 2];
    }
}
