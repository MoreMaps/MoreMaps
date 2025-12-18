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
import {firstValueFrom, Subscription} from 'rxjs';
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
import {RouteCostResult, RouteService} from '../../services/Route/route.service';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';
import {ROUTE_REPOSITORY} from '../../services/Route/RouteRepository';
import {RouteDB} from '../../services/Route/RouteDB';

// --- IMPORTS PARA EDICIÓN DE RUTA (Traídos del Navbar) ---
import {RouteOriginDialog, RouteOriginMethod} from '../route/route-origin-dialog/route-origin-dialog';
import {RouteOptionsDialogComponent} from '../route/route-options-dialog/route-options-dialog';
import {AddPoiDialogComponent, AddPoiMethod} from '../navbar/add-poi-dialog/add-poi-dialog';
import {CoordsSearchDialogComponent} from '../navbar/coords-search-dialog/coords-search-dialog';
import {PlaceNameSearchDialogComponent} from '../navbar/placename-search-dialog/placename-search-dialog';
import {SavedItemSelector} from '../../services/saved-items/saved-item-selector-dialog/savedSelectorData';
import {PointConfirmationDialog} from '../navbar/point-confirmation-dialog/point-confirmation-dialog';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';
import {FUEL_TYPE, VehicleModel} from '../../data/VehicleModel';

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

// --- MINI-COMPONENTE: DIÁLOGO DE CARGA BLOQUEANTE ---
@Component({
    selector: 'app-loading-route-dialog',
    template: `
        <div
            style="opacity: 1; background-color: rgba(255, 255, 255, 1); display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px;">
            <mat-spinner diameter="50" color="primary"></mat-spinner>
            <span style="font-size: 1.1em; font-weight: 500;">Calculando la mejor ruta...</span>
            <span style="font-size: 0.9em; color: gray;">Por favor, espera un momento.</span>
        </div>`,
    standalone: true,
    imports: [MatProgressSpinnerModule]
})
export class LoadingRouteDialogComponent {
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

const destinationIcon = L.icon({
    iconUrl: 'assets/images/poi_destination.png',
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
        VehicleService,
        RouteService,
        {provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI},
        {provide: POI_REPOSITORY, useClass: POIDB},
        {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
        {provide: ROUTE_REPOSITORY, useClass: RouteDB}
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
    private vehicleService = inject(VehicleService);
    private routeSubscription: Subscription | null = null;
    isRouteMode: boolean = false;
    private isRouteLoading: boolean = false;


    // Estado de la ruta
    private currentRouteState = {
        startHash: '',
        startName: '',
        endHash: '',
        endName: '',
        transport: TIPO_TRANSPORTE.VEHICULO,
        preference: PREFERENCIA.RAPIDA,
        matricula: undefined as string | undefined,
        vehicleAlias: undefined as string | undefined // Para visualización
    };

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

        this.route.queryParams.subscribe(params => {
            this.isRouteMode = params['mode'] === 'route';
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

        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }

    private initMap() {
        if (this.map) return;

        // Limit config
        const latBuffer = 50;
        const lonBuffer = 50;
        const southWest = L.latLng(-90 - latBuffer, -180 - lonBuffer);
        const northEast = L.latLng(90 + latBuffer, 180 + lonBuffer);
        const bounds = L.latLngBounds(southWest, northEast);

        this.map = L.map(this.mapContainer.nativeElement, {
            maxBounds: bounds,
            maxBoundsViscosity: 0.5,
            zoomControl: false
        });

        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        L.tileLayer(osmUrl, {
            maxZoom: 19,
            minZoom: 3,
            noWrap: true,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.map.whenReady(() => {
            setTimeout(() => {
                if (this.map) this.map.invalidateSize();
            }, 100);
        });

        this.setupMapClickHandler();
        this.setupLocationEventHandlers();
    }

    private handleInitialLocationLogic() {
        if (this.routeSubscription) this.routeSubscription.unsubscribe();
        this.routeSubscription = this.route.queryParams.subscribe(async params => {
            const mode = params['mode'];

            // CONSULTA DE RUTA
            if (mode === 'route') {
                const startHash = params['start'];
                const endHash = params['end'];
                const startName = params['startName'];
                const endName = params['endName'];
                const transport = params['transport'];
                const preference = params['preference'];
                const matricula = params['matricula'];

                if (startHash && endHash) {
                    await this.calculateAndDrawRoute(
                        startHash, endHash, startName, endName,
                        transport, preference, matricula
                    );
                    return;
                }
                console.warn("Faltan parámetros de ruta, cargando mapa estándar...")
            }

            // CONSULTAR POI EN MAPA

            const lat = params['lat'];
            const lon = params['lon'];
            const name = params['name'];

            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);

            const hasCoords = !isNaN(latNum) && !isNaN(lonNum);
            const hasPoiParams = hasCoords || !!name;

            // si hay POI, centramos en el POI, no en el usuario
            this.shouldCenterOnLocation = !hasPoiParams;

            // GESTIÓN DE UBICACIÓN DEL USUARIO (BEACON)
            if (this.mapUpdateService.lastKnownLocation) {
                // Si ya la tenemos, la pintamos
                this.handleLocationSuccess(this.mapUpdateService.lastKnownLocation);
            } else {
                // Si no, empezamos a buscar (en silencio si shouldCenterOnLocation es false)
                this.startLocating();
            }

            // INICIALIZACIÓN DEL MAPA Y POIs
            if (this.map) {
                this.map!.invalidateSize();
                // si tengo lan y lon...
                if (hasCoords) {
                    console.info('Cargando mapa con coordenadas específicas:', lat, lon);
                    this.map.setView([latNum, lonNum], 16);
                    if (name) {
                        const savedPoi = new POISearchModel(latNum, lonNum, name);
                        this.selectPOI(savedPoi, false);
                    } else {
                        await this.searchByCoords(latNum, lonNum);
                    }
                } else {
                    if (name) {
                        await this.searchByPlaceName(name);
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
        // Comprobación
        if (startHash === endHash) {
            this.showSnackbar('El origen y el destino no pueden ser el mismo.', 'Cerrar');
            // no se limpia la ruta anterior si ya existe una
            return;
        }

        let loadingDialogRef: MatDialogRef<LoadingRouteDialogComponent> | null = null;

        try {
            // 1. Activar bloqueo
            this.isRouteLoading = true;

            // 2. Mostrar diálogo bloqueante
            loadingDialogRef = this.dialog.open(LoadingRouteDialogComponent, {
                disableClose: true,
                hasBackdrop: true,
                panelClass: 'loading-dialog-panel'
            });

            // 3. Llamada a API. Antes de borrar, verificamos que la ruta existe
            const result: RouteResultModel = await this.mapSearchService.searchRoute(
                startHash, endHash, transport as TIPO_TRANSPORTE, preference as PREFERENCIA
            );

            // 4. Cálculo de costes
            let coste: RouteCostResult | null;

            try{
                if( transport == TIPO_TRANSPORTE.A_PIE || transport == TIPO_TRANSPORTE.BICICLETA ) {
                    coste = await this.routeService.getRouteCost(result.distancia, transport as TIPO_TRANSPORTE);
                }
                else {
                    const datosVehiculo: VehicleModel = await this.vehicleService.readVehicle(matricula!);

                    coste = await this.routeService.getRouteCost(result.distancia, transport as TIPO_TRANSPORTE,
                        datosVehiculo.consumoMedio, datosVehiculo.tipoCombustible as FUEL_TYPE)
                }
            } catch (error) {
                coste = null;
            }

            // ------ A PARTIR DE AQUÍ, PODEMOS CAMBIAR LA RUTA ------

            // 5. Cerrar diálogo de la ruta anterior y limpiar mapa
            if (this.routeDialogRef) {
                this.routeDialogRef.close();
                this.routeDialogRef = null;
            }
            this.clearMapSearchData();
            this.clearRouteMarkers();

            // 6. Guardar estado de la ruta y pintar marcadores Inicio y Fin
            this.currentRouteState = {
                startHash, endHash, startName, endName,
                transport: transport as TIPO_TRANSPORTE,
                preference: preference as PREFERENCIA,
                matricula: matricula,
                vehicleAlias: undefined
            };
            const startCoords = MapSearchAPI.decodeGeohash(startHash);
            const endCoords = MapSearchAPI.decodeGeohash(endHash);

            this.routeStartMarker = L.marker([startCoords[1], startCoords[0]], {
                icon: customIcon
            }).addTo(this.map!).bindPopup(`Origen: ${startName}`);

            this.routeEndMarker = L.marker([endCoords[1], endCoords[0]], {
                icon: destinationIcon
            }).addTo(this.map!).bindPopup(`Destino: ${endName}`);

            // 7. Pintar Geometría de Ruta
            if (result.geometry) {
                this.drawRouteGeometry(result.geometry);
            }

            // 8. Obtener nombre del vehículo y Abrir Diálogo
            let vehicleAlias = matricula || '';
            if (matricula && transport === TIPO_TRANSPORTE.VEHICULO) {
                const myVehicles = await this.vehicleService.getVehicleList();
                const found = myVehicles.find((v: any) => v.matricula === matricula);
                if (found) {
                    vehicleAlias = found.alias
                }
            }
            if (vehicleAlias != '') this.currentRouteState.vehicleAlias = vehicleAlias;

            // Cerramos el diálogo bloqueante de carga
            if (loadingDialogRef) loadingDialogRef.close();
            this.isRouteLoading = false;

            // Abrimos el diálogo pasando el alias correcto y la preferencia
            this.openRouteDetailsDialog(result, startName, endName, transport, preference, coste, vehicleAlias);

        } catch (e) {
            // Cerramos el diálogo de carga bloqueante
            if (loadingDialogRef) loadingDialogRef.close();

            // Mostramos el error
            if (e instanceof ImpossibleRouteError)
                this.showSnackbar('No existe una ruta entre los dos puntos.', 'Cerrar');
            else
                this.showSnackbar('Error calculando la ruta', 'Cerrar');
            console.error(e);

            /* NO borramos nada de la ruta anterior cuando exista.
            Si no había ruta anterior, limpiamos la URL. */
            if (!this.routeLayer) {
                this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: {}, // Limpiamos params para quitar mode=route
                    replaceUrl: true
                });
            }
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
        this.map?.fitBounds(this.routeLayer.getBounds(), {padding: [50, 200]});
    }

    private openRouteDetailsDialog(
        routeResult: RouteResultModel,
        startName: string, endName: string,
        transport: any, preference: string,
        coste: RouteCostResult | null, matricula?: string,
    ) {
        this.closePOIDetailsDialog();

        this.routeDialogRef = this.dialog.open(RouteDetailsDialog, {
            position: {bottom: '30px', right: '30px'},
            width: '90vw',
            maxWidth: '400px',
            hasBackdrop: false,
            panelClass: 'route-dialog-panel',
            data: {
                origenName: startName,
                destinoName: endName,
                transporte: transport,
                routeResult: routeResult,
                preference: preference,
                matricula: matricula, // Puede ser el alias si viene del calculateAndDrawRoute
                vehicleAlias: matricula, // Pasamos lo mismo para mostrar
                coste: coste,
            }
        });

        // INSTANCIA
        const instance = this.routeDialogRef.componentInstance;

        // 1. EVENTOS DE EDICIÓN
        instance.editOrigin.subscribe(() => this.editRouteAttribute(1));      // Caso 1
        instance.editDestination.subscribe(() => this.editRouteAttribute(2)); // Caso 2
        instance.editTransport.subscribe(() => this.editRouteAttribute(3));   // Caso 3

        // 2. SWAP
        instance.swap.subscribe(() => this.swapOriginDest());

        // 3. PREFERENCIA (El select cambia, recalculamos directo)
        instance.preferenceChange.subscribe((newPref) => this.updatePreference(newPref));

        // 4. CIERRE
        instance.closeRoute.subscribe(() => {
            this.clearRoute();
        });

        // 5. GUARDAR
        instance.save.subscribe(async () => {
            // TODO: REEMPLAZAR UNDEFINED EN MERGE POR COSTE
            try {
                await this.routeService.createRoute(
                    this.currentRouteState.startHash, this.currentRouteState.endHash, this.currentRouteState.transport,
                    this.currentRouteState.preference, undefined, this.currentRouteState.matricula);
                this.showSnackbar('Ruta guardada', 'OK');
            } catch (error) {
                this.showSnackbar('Fallo al guardar ruta: ' + error, 'OK');
            }
        });
    }

    private clearRoute() {
        if (this.routeLayer) {
            this.map?.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }
        this.clearRouteMarkers();
        this.deleteMarkers();

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
        if (this.userLocationMarker) {
            this.userLocationMarker.setLatLng(latlng);
        } else {
            const pulsingIcon = L.divIcon({
                className: 'pulsing-beacon',
                html: '<div class="beacon-core"></div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
                popupAnchor: [0, -10]
            });

            this.userLocationMarker = L.marker(latlng, {
                icon: pulsingIcon,
                zIndexOffset: 1000
            }).addTo(this.map!);
        }

        if (this.shouldCenterOnLocation) {
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }
            if (this.map) this.map.setView(latlng, 15);
        }
    }

    private startLocating() {
        if (this.routeLayer) return;
        if (this.shouldCenterOnLocation)
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

    /** Limpia la memoria, el mapa visual y la URL
     * */
    private resetMapState(): void {
        // Limpia datos visuales
        this.clearMapSearchData();

        // Limpia la URL (Solo usar esto cuando salimos del modo ruta o búsqueda totalmente)
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
        });
    }

    /** Limpia la memoria y el mapa visual.
     * */
    private clearMapSearchData(): void {
        this.deleteCurrentMarker();
        this.deleteMarkers();
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

        let marker = L.marker([poi.lat, poi.lon], {icon: customIcon})
            .addTo(this.map)
            .bindPopup("Encontrado: " + poi.placeName);

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

        if (this.listMarkers.length === 1) {
            const marker = this.listMarkers[0];
            if (this.map) this.map.flyTo(marker.getLatLng(), 16, {animate: true, duration: 1});
            marker.openPopup();
            return;
        }

        const group = L.featureGroup(this.listMarkers);

        if (this.map) this.map.fitBounds(group.getBounds(), {
            padding: [50, 50],
            maxZoom: 16,
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
            this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                horizontalPosition: 'left',
                verticalPosition: 'bottom',
                duration: 0
            });

            const poiSearchResult: POISearchModel = await this.mapSearchService.searchPOIByCoords(lat, lon);

            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            this.selectPOI(poiSearchResult);

        } catch (error: any) {
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }

            if (error instanceof CoordsNotFoundError) {
                this.snackBar.open(
                    `No se encontró ninguna dirección en las coordenadas (${lat}, ${lon}).`,
                    'OK',
                    {duration: 5000}
                );
            } else {
                const msg = error.message ? error.message : 'Error desconocido';
                this.snackBar.open(`Error al buscar: ${msg}`, 'Cerrar', {duration: 5000});
            }
            console.error(`Error al buscar por coordenadas: ${error}`);
        }
    }

    async searchByPlaceName(placeName: string): Promise<void> {
        if (this.loadingSnackBarRef) this.loadingSnackBarRef.dismiss();

        try {
            this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                horizontalPosition: 'left',
                verticalPosition: 'bottom',
                duration: 0
            });

            const poiSearchResult: POISearchModel[] = await this.mapSearchService.searchPOIByPlaceName(placeName);

            this.selectPOI(poiSearchResult);

        } catch (error: any) {
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
            }
            console.error(`Error al buscar por topónimo: ${error}`);
            this.snackBar.open(`Error al buscar: ${error.message}`, 'Cerrar', {duration: 5000});
        } finally {
            if (this.loadingSnackBarRef) {
                this.loadingSnackBarRef.dismiss();
                this.loadingSnackBarRef = null;
            }
        }
    }

    private setupMapClickHandler(): void {
        if (this.map) this.map.on('click', async (e: L.LeafletMouseEvent) => {

            if (this.isRouteLoading || this.routeLayer) return; // ignorar clics en ambos casos

            const lat = e.latlng.lat;
            const lon = e.latlng.lng;

            await this.searchByCoords(lat, lon);
        });
    }

    openPOIDetailsDialog(): void {
        this.poiDialogRef = this.dialog.open(PoiDetailsDialog, {
            position: {bottom: '20px', left: '20px'},
            width: '50vw',
            maxWidth: '500px',
            height: 'auto',
            maxHeight: '15vh',
            hasBackdrop: false,
            disableClose: true,
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

        this.poiDialogRef.componentInstance.save.subscribe(() => {
            this.poiDialogRef!.close({savePOI: true});
        });

        this.poiDialogRef.componentInstance.center.subscribe(() => {
            const poi = this.currentPOI();
            if (poi && this.map) {
                this.map.flyTo([poi.lat, poi.lon], this.map.getZoom(), {
                    animate: true,
                    duration: 1,
                })
            }
        });

        this.poiDialogRef.componentInstance.next.subscribe(() => {
            this.goToNextPOI();
        });
        this.poiDialogRef.componentInstance.prev.subscribe(() => {
            this.goToPreviousPOI();
        });

        this.poiDialogRef.afterClosed().subscribe(result => {
            if (result?.ignore) return;
            if (result?.savePOI && result.savePOI && this.currentPOI()) {
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

    private selectPOI(poi: POISearchModel | POISearchModel[], animate: boolean = true): void {
        this.deleteCurrentMarker();
        this.deleteMarkers();
        this.closePOIDetailsDialog();

        const isList = Array.isArray(poi);
        const newData = isList ? poi : [poi];

        this.listPOIs.set(newData)
        this.currentIndex.set(0);
        this.currentPOI.set(newData[0]);

        if (isList) {
            this.addListMarkers(newData);
            this.currentMarker = this.listMarkers![0];
        } else {
            this.currentMarker = this.addMarker(poi as POISearchModel);
        }

        this.highlightMarker(0);
        if (animate) {
            this.fitMapToMarkers();
        } else {
            if (this.currentMarker) {
                this.currentMarker.openPopup();
            }
        }
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
     * Gestiona la edición de un parámetro de la ruta.
     */
    async editRouteAttribute(step: number) {
        // Variables temporales basadas en el estado actual
        let nextStartName = this.currentRouteState.startName;
        let nextStartHash = this.currentRouteState.startHash;
        let nextEndName = this.currentRouteState.endName;
        let nextEndHash = this.currentRouteState.endHash;
        let nextTransport = this.currentRouteState.transport;
        let nextMatricula = this.currentRouteState.matricula;

        let dataChanged = false;

        switch (step) {
            case 1: // ORIGEN
                const originData = await this.getPointFromUser(
                    'Cambiar Origen', '¿Desde dónde quieres salir?',
                    1, 4, true
                );
                if (originData && originData !== 'BACK') {
                    nextStartName = originData.name;
                    nextStartHash = originData.hash || geohashForLocation([originData.lat, originData.lon], 7);
                    dataChanged = true;
                }
                break;

            case 2: // DESTINO
                const destData = await this.getPointFromUser(
                    'Cambiar Destino', '¿A dónde quieres ir?',
                    2, 4, true
                );
                if (destData && destData !== 'BACK') {
                    nextEndName = destData.name;
                    nextEndHash = destData.hash || geohashForLocation([destData.lat, destData.lon], 7);
                    dataChanged = true;
                }
                break;

            case 3: // TRANSPORTE
                const newTransport = await this.getRouteOption<TIPO_TRANSPORTE | 'BACK'>('transport', 3, 4);

                if (newTransport && newTransport !== 'BACK') {
                    // Variable temporal para la matrícula candidata
                    let candidateMatricula: string | undefined = undefined;

                    // Si elige vehículo, hay que preguntar cuál (incluso si ya tenía uno, podría querer cambiar de coche)
                    if (newTransport === TIPO_TRANSPORTE.VEHICULO) {
                        const savedVehicle = await this.selectSavedItem('vehiculos', 'Selecciona tu vehículo', true);

                        // Si cancela o da atrás en la selección de coche, no hacemos nada
                        if (!savedVehicle) return;
                        if (savedVehicle === 'BACK') return;

                        candidateMatricula = savedVehicle.matricula;
                    }

                    // Si el transporte es el mismo Y la matrícula es la misma (o ambas undefined en caso de bici/pie)
                    if (newTransport === this.currentRouteState.transport &&
                        candidateMatricula === this.currentRouteState.matricula) {
                        return; // no hacemos nada
                    }

                    nextTransport = newTransport as TIPO_TRANSPORTE;
                    nextMatricula = candidateMatricula;
                    dataChanged = true;
                }
                break;
        }

        if (!dataChanged) return;

        // Llamamos a la función principal con los DATOS CANDIDATOS
        // Si falla, no pasará nada y el usuario seguirá viendo lo que veía.
        this.calculateAndDrawRoute(
            nextStartHash,
            nextEndHash,
            nextStartName,
            nextEndName,
            nextTransport,
            this.currentRouteState.preference, // Mantenemos preferencia actual
            nextMatricula
        );
    }

    /** Invierte valores de origen y destino temporalmente y los envía a valorar.
     * */
    swapOriginDest() {
        this.calculateAndDrawRoute(
            this.currentRouteState.endHash,   // Start <- End
            this.currentRouteState.startHash, // End <- Start
            this.currentRouteState.endName,   // StartName <- EndName
            this.currentRouteState.startName, // EndName <- StartName
            this.currentRouteState.transport,
            this.currentRouteState.preference,
            this.currentRouteState.matricula
        );
    }
    /** Envía la nueva preferencia a probar.
     * */
    updatePreference(newPref: PREFERENCIA) {
        if (newPref === this.currentRouteState.preference) {
            return;
        }
        this.calculateAndDrawRoute(
            this.currentRouteState.startHash,
            this.currentRouteState.endHash,
            this.currentRouteState.startName,
            this.currentRouteState.endName,
            this.currentRouteState.transport,
            newPref, // Nueva preferencia
            this.currentRouteState.matricula
        );
    }

    private recalculateCurrentRoute() {
        this.calculateAndDrawRoute(
            this.currentRouteState.startHash,
            this.currentRouteState.endHash,
            this.currentRouteState.startName,
            this.currentRouteState.endName,
            this.currentRouteState.transport,
            this.currentRouteState.preference,
            this.currentRouteState.matricula
        );
    }

    private reopenRouteDialog() {
        this.recalculateCurrentRoute();
    }

    // ==========================================================
    // HELPERS COPIADOS Y ADAPTADOS DEL NAVBAR
    // ==========================================================

    private async getPointFromUser(
        title: string,
        subtitle: string,
        currentStep: number,
        totalSteps: number,
        showBack: boolean
    ): Promise<any | 'BACK' | null> {
        while (true) {
            // 1. Abrir diálogo de "¿Guardado o Buscar?"
            const dialogRef = this.dialog.open(RouteOriginDialog, {
                width: '90%', maxWidth: '400px',
                data: {title, subtitle, currentStep, totalSteps, showBack}
            });

            const originMethod = await firstValueFrom(dialogRef.afterClosed()) as RouteOriginMethod;

            if (originMethod === 'BACK') return 'BACK';
            if (!originMethod) return null;

            // CASO A: Guardados
            if (originMethod === 'saved') {
                const savedPoi = await this.selectSavedItem('lugares', 'Mis lugares guardados');

                if (savedPoi === 'BACK') return 'BACK';
                if (savedPoi) {
                    return {
                        hash: savedPoi.geohash,
                        name: savedPoi.alias || savedPoi.placeName,
                        lat: savedPoi.lat,
                        lon: savedPoi.lon
                    };
                }
                continue;
            }

            // CASO B: Búsqueda
            const searchMethod = await this.askForSearchMethod();
            if (!searchMethod) continue;

            const search = await this.executeSearchMethod(searchMethod, true);
            if (search === 'BACK') continue;
            if (search) {
                const finalLat = search.lat;
                const finalLon = search.lon;
                const hash = (finalLat && finalLon) ? geohashForLocation([finalLat, finalLon], 7) : undefined;

                return {
                    ...search,
                    hash: hash
                };
            }
        }
    }

    private async askForSearchMethod(): Promise<AddPoiMethod> {
        const dialogRef = this.dialog.open(AddPoiDialogComponent, {
            width: '90%', maxWidth: '400px'
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }

    private async executeSearchMethod(method: AddPoiMethod, confirm: boolean): Promise<any | 'BACK' | null> {
        let potentialPOI: POISearchModel | null = null;

        try {
            if (method === 'coords') {
                const dialogRef = this.dialog.open(CoordsSearchDialogComponent, {width: '90%', maxWidth: '400px'});
                const coords = await firstValueFrom(dialogRef.afterClosed());

                if (!coords) return 'BACK';

                const snackBarRef = this.snackBar.open('Obteniendo dirección...', '', {duration: 0});

                try {
                    potentialPOI = await this.mapSearchService.searchPOIByCoords(coords.lat, coords.lon);
                } finally {
                    snackBarRef.dismiss();
                }

                if (!potentialPOI) {
                    this.snackBar.open('No se pudo obtener la dirección.', 'OK', {duration: 3000});
                    return 'BACK';
                }

            } else if (method === 'name') {
                const dialogRef = this.dialog.open(PlaceNameSearchDialogComponent, {width: '90%', maxWidth: '400px'});
                const nameStr = await firstValueFrom(dialogRef.afterClosed());

                if (!nameStr) return 'BACK';

                const snackBarRef = this.snackBar.open('Buscando lugar...', '', {duration: 0});
                let results: POISearchModel[] = [];
                try {
                    results = await this.mapSearchService.searchPOIByPlaceName(nameStr);
                } finally {
                    snackBarRef.dismiss();
                }

                if (results && results.length > 0) {
                    if (!confirm) return {name: nameStr};

                    const selectedResult = await this.selectSavedItem(
                        'search-results',
                        'Resultados de búsqueda',
                        true,
                        results
                    );
                    if (selectedResult === 'BACK') return 'BACK';
                    if (!selectedResult) return null;
                    potentialPOI = selectedResult;
                } else {
                    this.snackBar.open('No se encontraron resultados', 'OK', {duration: 3000});
                    return 'BACK';
                }
            }
        } catch (error) {
            console.error(error);
            this.snackBar.open(`Búsqueda sin resultados.`, '', {duration: 3000});
            return 'BACK';
        }

        if (potentialPOI) {
            if (confirm) {
                const confirmRef = this.dialog.open(PointConfirmationDialog, {
                    width: '90%', maxWidth: '400px',
                    data: potentialPOI
                });
                const confirmed = await firstValueFrom(confirmRef.afterClosed());

                if (confirmed) {
                    return {
                        lat: potentialPOI.lat,
                        lon: potentialPOI.lon,
                        name: potentialPOI.placeName
                    };
                } else {
                    return 'BACK';
                }
            } else {
                return {
                    lat: potentialPOI.lat,
                    lon: potentialPOI.lon,
                    name: potentialPOI.placeName
                };
            }
        }
        return null;
    }

    private async getRouteOption<T>(type: 'transport' | 'preference', currentStep: number, totalSteps: number): Promise<T | null> {
        const dialogRef = this.dialog.open(RouteOptionsDialogComponent, {
            width: '90%', maxWidth: '400px',
            disableClose: false,
            data: {type, currentStep, totalSteps, showBack: true}
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }

    private async selectSavedItem(
        type: 'lugares' | 'vehiculos' | 'search-results',
        title?: string,
        showBack: boolean = false,
        items?: any[]
    ): Promise<any | 'BACK' | null> {
        const dialogRef = this.dialog.open(SavedItemSelector, {
            width: '90%', maxWidth: '450px',
            height: 'auto', maxHeight: '80vh',
            data: {type, title, showBack, items}
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }
}
