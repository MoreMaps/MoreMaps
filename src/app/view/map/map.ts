import {
    AfterViewInit,
    Component,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    signal,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {MapUpdateService} from '../../services/map/map-update-service/map-updater';
import {MatSnackBar, MatSnackBarModule, MatSnackBarRef} from '@angular/material/snack-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {Auth, authState} from '@angular/fire/auth';
import {ActivatedRoute, Router} from '@angular/router';
import {firstValueFrom, Subscription} from 'rxjs';
import {NavbarComponent} from '../navbar/navbar.component';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {MapSearchService} from '../../services/map/map-search-service/map-search.service';
import {MAP_SEARCH_REPOSITORY} from '../../services/map/map-search-service/MapSearchRepository';
import {MapSearchAPI} from '../../services/map/map-search-service/MapSearchAPI';
import {POISearchModel} from '../../data/POISearchModel';
import {PoiDetailsDialog} from './poi-details-dialog/poi-details-dialog';
import {POIService} from '../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {Geohash, geohashForLocation} from 'geofire-common';
import {MatIcon} from '@angular/material/icon';
import {MatFabButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import {CoordsNotFoundError} from '../../errors/POI/CoordsNotFoundError';
import {RouteDetailsDialog} from '../route/route-details-dialog/routeDetailsDialog';
import {RouteResultModel} from '../../data/RouteResultModel';
import {RouteCostResult, RouteService} from '../../services/Route/route.service';
import {mapaTransporte, PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {VehicleService} from '../../services/Vehicle/vehicle.service';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';
import {ROUTE_REPOSITORY} from '../../services/Route/RouteRepository';
import {RouteDB} from '../../services/Route/RouteDB';
import {MapCoreService} from '../../services/map/map-core-service';
import {MarkerLayerService} from '../../services/map/marker-layer-service';
import {RouteLayerService} from '../../services/map/route-layer-service';
import {BeaconLayerService} from '../../services/map/beacon-layer-service';

// --- IMPORTS PARA EDICIÓN DE RUTA (Traídos del Navbar) ---
import {RouteOriginDialog, RouteOriginMethod} from '../route/route-origin-dialog/route-origin-dialog';
import {RouteOptionsDialogComponent} from '../route/route-options-dialog/route-options-dialog';
import {AddPoiDialogComponent, AddPoiMethod} from '../navbar/add-poi-dialog/add-poi-dialog';
import {CoordsSearchDialogComponent} from '../navbar/coords-search-dialog/coords-search-dialog';
import {PlaceNameSearchDialogComponent} from '../navbar/placename-search-dialog/placename-search-dialog';
import {SavedItemSelector} from '../../services/saved-items/saved-item-selector-dialog/savedSelectorData';
import {PointConfirmationDialog} from '../navbar/point-confirmation-dialog/point-confirmation-dialog';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {GeohashDecoder} from '../../utils/geohashDecoder';
import {
    ELECTRICITY_PRICE_REPOSITORY,
    ELECTRICITY_PRICE_SOURCE
} from '../../services/electricity-price-service/ElectricityPriceRepository';
import {ElectricityPriceCache} from '../../services/electricity-price-service/ElectricityPriceCache';
import {ElectricityPriceAPI} from '../../services/electricity-price-service/ElectricityPriceAPI';
import {FUEL_PRICE_REPOSITORY, FUEL_PRICE_SOURCE} from '../../services/fuel-price-service/FuelPriceRepository';
import {FuelPriceCache} from '../../services/fuel-price-service/FuelPriceCache';
import {FuelPriceService} from '../../services/fuel-price-service/fuel-price-service';
import {ElectricityPriceService} from '../../services/electricity-price-service/electricity-price-service';
import {FuelPriceAPI} from '../../services/fuel-price-service/FuelPriceAPI';

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
        FuelPriceService,
        ElectricityPriceService,
        {provide: MAP_SEARCH_REPOSITORY, useClass: MapSearchAPI},
        {provide: POI_REPOSITORY, useClass: POIDB},
        {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
        {provide: ROUTE_REPOSITORY, useClass: RouteDB},
        {provide: ELECTRICITY_PRICE_REPOSITORY, useClass: ElectricityPriceCache},
        {provide: ELECTRICITY_PRICE_SOURCE, useClass: ElectricityPriceAPI},
        {provide: FUEL_PRICE_REPOSITORY, useClass: FuelPriceCache},
        {provide: FUEL_PRICE_SOURCE, useClass: FuelPriceAPI},
    ],
})
export class LeafletMapComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('mapContainer') private mapContainer!: ElementRef<HTMLDivElement>;
    private router = inject(Router);

    protected currentPOI = signal<POISearchModel | null>(null);
    protected listPOIs = signal<POISearchModel[]>([]);
    protected currentIndex = signal<number>(-1);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);
    private authSubscription: Subscription | null = null;
    private mapSearchService = inject(MapSearchService);
    private poiService = inject(POIService);
    private poiDialogRef: MatDialogRef<PoiDetailsDialog> | null = null
    private savedPOIs: Geohash[] = []
    private route = inject(ActivatedRoute);
    private shouldCenterOnLocation = true;
    private routeDialogRef: MatDialogRef<RouteDetailsDialog> | null = null;
    private routeService = inject(RouteService);
    private vehicleService = inject(VehicleService);
    private routeSubscription: Subscription | null = null;
    isRouteMode: boolean = false;
    private isRouteLoading: boolean = false;
    private location = inject(Location);
    private mapCoreService = inject(MapCoreService);
    private markerLayerService = inject(MarkerLayerService);
    private routeLayerService = inject(RouteLayerService);
    private beaconLayerService = inject(BeaconLayerService);


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

    private mapSubscriptions: Subscription = new Subscription();

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
            if (this.routeLayerService.hasActiveRoute()) {
                this.showSnackbar('Cierra la ruta actual para realizar nuevas búsquedas.', 'OK');
                return;
            }
            console.info('Recibidas coordenadas externas:', coords);
            this.searchByCoords(coords.lat, coords.lon);
        });

        this.mapUpdateService.searchPlaceName$.subscribe((placeName) => {
            if (this.routeLayerService.hasActiveRoute()) {
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
                const mapElement = this.mapContainer.nativeElement;
                this.mapCoreService.initMap(mapElement);
                this.setupMapEventSubscriptions();
                this.handleInitialLocationLogic();

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

        if (this.routeDialogRef) {
            this.routeDialogRef.close();
        }

        if (this.loadingSnackBarRef) {
            this.loadingSnackBarRef.dismiss()
        }

        if (this.mapSubscriptions) {
            this.mapSubscriptions.unsubscribe();
        }

        this.mapCoreService.destroy();

        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }

    private setupMapEventSubscriptions(): void {
        // Evento Click en el mapa
        this.mapSubscriptions.add(
            this.mapCoreService.mapClick$.subscribe(coords => {
                // Comprobamos bloqueos
                if (this.isRouteLoading || this.routeLayerService.hasActiveRoute()) return;
                this.searchByCoords(coords.lat, coords.lon).then();
            })
        );

        // Evento Ubicación encontrada
        this.mapSubscriptions.add(
            this.beaconLayerService.locationFound$.subscribe(latlng => {
                this.mapUpdateService.lastKnownLocation = latlng;

                if (this.loadingSnackBarRef) {
                    this.loadingSnackBarRef.dismiss();
                }

                // Gestionamos UI y movimiento
                if (this.shouldCenterOnLocation) {
                    this.beaconLayerService.centerOnUser(true);
                    if (this.loadingSnackBarRef)
                        this.showSnackbar('Ubicación encontrada.', '¡Bien!');
                }
            })
        );

        // Evento Error Ubicación
        this.mapSubscriptions.add(
            this.beaconLayerService.locationError$.subscribe(() => {
                if (this.loadingSnackBarRef) this.loadingSnackBarRef.dismiss();

                const snackRef = this.snackBar.open(
                    'No se ha podido obtener la ubicación actual.',
                    'Reintentar',
                    {duration: 10000}
                );
                snackRef.onAction().subscribe(() => this.startLocating());
            })
        );
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
                this.beaconLayerService.setUserLocation(this.mapUpdateService.lastKnownLocation);
                // Si la lógica dice que debemos centrar, lo hacemos
                if (this.shouldCenterOnLocation) {
                    this.beaconLayerService.centerOnUser(false);
                }
            } else {
                // Si no, empezamos a buscar
                this.startLocating();
            }

            // INICIALIZACIÓN DEL MAPA Y POIs
            if (hasCoords) {
                this.mapCoreService.setView(latNum, lonNum, 16);
                if (name) {
                    const savedPoi = new POISearchModel(latNum, lonNum, name);
                    this.selectPOI(savedPoi);
                } else {
                    await this.searchByCoords(latNum, lonNum);
                }
            } else {
                if (name) {
                    await this.searchByPlaceName(name);
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
        // 1. Validaciones (Igual que antes)
        if (startHash === endHash) {
            this.showSnackbar('El origen y el destino no pueden ser el mismo.', 'Cerrar');
            return;
        }

        let loadingDialogRef: MatDialogRef<LoadingRouteDialogComponent> | null = null;

        try {
            // 2. UI: Bloqueo y Carga (Igual que antes)
            this.isRouteLoading = true;
            loadingDialogRef = this.dialog.open(LoadingRouteDialogComponent, {
                disableClose: true,
                hasBackdrop: true,
                panelClass: 'loading-dialog-panel'
            });

            // 3. LÓGICA DE NEGOCIO: Llamadas a API (Igual que antes)
            const result: RouteResultModel = await this.mapSearchService.searchRoute(
                startHash, endHash, transport as TIPO_TRANSPORTE, preference as PREFERENCIA
            );

            // 4. LÓGICA DE NEGOCIO: Cálculo de costes (Igual que antes)
            let coste: RouteCostResult | null;
            try {
                if (transport == TIPO_TRANSPORTE.A_PIE || transport == TIPO_TRANSPORTE.BICICLETA) {
                    coste = await this.routeService.getRouteCost(result, transport as TIPO_TRANSPORTE);
                } else {
                    // Nota: Asumimos que vehicleService y routeService siguen funcionando igual
                    const datosVehiculo = await this.vehicleService.readVehicle(matricula!);
                    coste = await this.routeService.getRouteCost(result, transport as TIPO_TRANSPORTE,
                        datosVehiculo.consumoMedio, datosVehiculo.tipoCombustible as FUEL_TYPE);
                }
            } catch (error) {
                coste = null;
            }

            // 5. GESTIÓN DE ESTADO VISUAL

            // A) Limpiar diálogos previos
            if (this.routeDialogRef) {
                this.routeDialogRef.close();
                this.routeDialogRef = null;
            }

            // B) Limpiar mapa: Quitamos POIs y rutas viejas
            // Usamos los métodos de limpieza lógica del paso anterior
            this.clearMapSearchData();
            // Delegamos la limpieza visual de la ruta al servicio
            this.routeLayerService.clear(); // Reemplaza a clearRouteMarkers() y removeLayer()

            // C) Guardar estado lógico de la ruta actual
            this.currentRouteState = {
                startHash, endHash, startName, endName,
                transport: transport as TIPO_TRANSPORTE,
                preference: preference as PREFERENCIA,
                matricula: matricula,
                vehicleAlias: undefined
            };

            // D) PINTAR EN EL MAPA (DELEGACIÓN)
            // Decodificamos geohashes para obtener lat/lon
            const startCoords = GeohashDecoder.decodeGeohash(startHash);
            const endCoords = GeohashDecoder.decodeGeohash(endHash);

            // Pinta los marcadores de Inicio y Fin
            this.routeLayerService.drawAnchors(
                {lat: startCoords[1], lon: startCoords[0], name: startName},
                {lat: endCoords[1], lon: endCoords[0], name: endName}
            );

            // Pinta la línea naranja de la ruta (si existe geometría)
            if (result.geometry) {
                this.routeLayerService.drawGeometry(result.geometry);
            }

            // 6. Finalización (Igual que antes)
            // Obtener alias del vehículo
            let vehicleAlias = matricula || '';
            if (matricula && transport === TIPO_TRANSPORTE.VEHICULO) {
                const myVehicles = await this.vehicleService.getVehicleList();
                const found = myVehicles.find((v: any) => v.matricula === matricula);
                if (found) {
                    vehicleAlias = found.alias
                }
            }
            if (vehicleAlias != '') this.currentRouteState.vehicleAlias = vehicleAlias;

            if (loadingDialogRef) loadingDialogRef.close();
            this.isRouteLoading = false;

            // Abrir el diálogo de detalles (sin cambios en la llamada)
            this.openRouteDetailsDialog(result, startName, endName, transport, preference, coste, vehicleAlias);

            // Actualizar URL
            const urlTree = this.router.createUrlTree([], {
                relativeTo: this.route,
                queryParams: {}
            });
            this.location.replaceState(urlTree.toString());

        } catch (e) {
            // Manejo de errores (Igual que antes)
            if (loadingDialogRef) loadingDialogRef.close();

            if (e instanceof ImpossibleRouteError)
                this.showSnackbar('No existe una ruta entre los dos puntos.', 'Cerrar');
            else
                this.showSnackbar('Error calculando la ruta', 'Cerrar');
            console.error(e);

            // Comprobación segura usando el servicio en lugar de this.routeLayer visual
            if (!this.routeLayerService.hasActiveRoute()) {
                await this.router.navigate([], {relativeTo: this.route, queryParams: {}, replaceUrl: true});
            }
        }
    }

    private openRouteDetailsDialog(
        routeResult: RouteResultModel,
        startName: string, endName: string,
        transport: any, preference: string,
        coste: RouteCostResult | null, matricula?: string,
    ) {
        this.closePOIDetailsDialog();

        this.routeDialogRef = this.dialog.open(RouteDetailsDialog, {
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
            // Transporte para el alias por defecto
            const transporte = mapaTransporte[this.currentRouteState.transport] || 'desconocido';

            // Alias por defecto
            const alias = `Ruta de ${startName.split(',')[0]} a ${endName.split(',')[0]} ${transporte}`;

            // Llamada al servicio para crear la ruta
            try {
                let route = await this.routeService.createRoute(
                    this.currentRouteState.startHash, this.currentRouteState.endHash, alias,
                    this.currentRouteState.transport, this.currentRouteState.startName, this.currentRouteState.endName,
                    this.currentRouteState.preference, routeResult, this.currentRouteState.matricula
                );
                this.routeSnackbar('Ruta guardada', 'Ver', route.id());
            } catch (error) {
                this.showSnackbar('Fallo al guardar ruta: ' + error, 'OK');
            }
        });
    }

    private clearRoute() {
        // 1. Limpieza Visual Delegada
        this.routeLayerService.clear(); // Limpia línea y marcadores de ruta
        this.markerLayerService.clearMarkers(); // Limpia POIs si quedaron

        // 2. Limpieza Lógica y URL
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {}
        }).then();
    }

    /** Si no estamos en modo ruta, inicia la localización del usuario.
     * */
    private startLocating() {
        // Validación: No localizar si hay una ruta pintada
        if (this.routeLayerService.hasActiveRoute()) return;

        if (this.shouldCenterOnLocation)
            this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                horizontalPosition: 'left',
                verticalPosition: 'bottom',
                duration: 0
            });

        // El servicio se encarga de llamar a map.locate
        this.beaconLayerService.startLocating();
    }


    /** Limpia la memoria, el mapa visual y la URL */
    private resetMapState(): void {
        this.clearMapSearchData();

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
        }).then();
    }

    /** Limpia la memoria y el mapa visual. */
    private clearMapSearchData(): void {
        // Limpieza Lógica
        this.listPOIs.set([]);
        this.currentIndex.set(-1);
        this.poiDialogRef = null;
        this.currentPOI.set(null);

        // Limpieza Visual DELEGADA
        this.markerLayerService.clearMarkers();
    }

    private async updateSaved(): Promise<void> {
        this.savedPOIs = [];
        let currentList = await this.poiService.getPOIList();
        for (const item of currentList) {
            this.savedPOIs.push(item.geohash);
        }
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
                    this.router.navigate(['/saved'], {queryParams: {type: 'lugares', id: geohash}}).then();
                    break;
                default:
                    snackBarRef.dismiss();
            }
        });
    }

    private routeSnackbar(msg: string, action: string, route?: string): void {
        const snackBarRef = this.snackBar.open(msg, action, {
            duration: 5000,
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
        });

        snackBarRef.onAction().subscribe(() => {
            snackBarRef.dismiss();
            this.router.navigate(['/saved'], {queryParams: {type: 'rutas', id: route}}).then();
        })
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

        this.poiDialogRef.componentInstance.save.subscribe(async () => {
            this.poiDialogRef!.close({savePOI: true});
        });

        this.poiDialogRef.componentInstance.center.subscribe(() => {
            const poi = this.currentPOI();
            if (poi) {
                this.mapCoreService.flyTo(poi.lat, poi.lon);
            }
        });

        this.poiDialogRef.componentInstance.next.subscribe(() => {
            this.goToNextPOI();
        });
        this.poiDialogRef.componentInstance.prev.subscribe(() => {
            this.goToPreviousPOI();
        });

        this.poiDialogRef.afterClosed().subscribe(async result => {
            if (result?.ignore) return;
            if (result?.savePOI && result.savePOI && this.currentPOI()) {
                let curPOI = <POISearchModel>this.currentPOI();
                await this.poiService.createPOI(curPOI).then();
                let lat = curPOI.lat;
                let lon = curPOI.lon;
                let geohash = geohashForLocation([lat, lon], 7);
                this.resetMapState();
                void this.updateSaved().then();
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

    private goToPOIIndex(index: number): void {
        const list = this.listPOIs();
        if (!list.length || index < 0 || index >= list.length) return;

        const nextPoi = list[index];

        // Actualizar estado lógico
        this.currentIndex.set(index);
        this.currentPOI.set(nextPoi);

        // Actualizar POI en el diálogo si está abierto
        if (this.poiDialogRef && this.poiDialogRef.componentInstance) {
            this.poiDialogRef.componentInstance.updatePOI(nextPoi, index, this.savedPOIs);
        }

        // DELEGACIÓN VISUAL: Resaltar y Mover cámara
        this.markerLayerService.highlightMarker(index);
        this.mapCoreService.panTo(nextPoi.lat, nextPoi.lon); // Usamos el Core para mover la cámara
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
        // Limpieza de estado lógico
        this.closePOIDetailsDialog();

        // Actualización de estado lógico
        const isList = Array.isArray(poi);
        const newData = isList ? poi : [poi];

        this.listPOIs.set(newData);
        this.currentIndex.set(0);
        this.currentPOI.set(newData[0]);

        // Pintar markers con el servicio
        this.markerLayerService.renderMarkers(newData);

        // Resaltar el primer marker
        this.markerLayerService.highlightMarker(0);

        // Abrir diálogo
        this.openPOIDetailsDialog();
    }

    public centerOnUser(): void {
        this.beaconLayerService.centerOnUser();
    }

    public refreshLocation(): void {
        if (this.snackBar) this.snackBar.dismiss();
        this.shouldCenterOnLocation = true;
        this.startLocating();
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
        ).then();
    }

    /** Invierte valores de origen y destino temporalmente y los envía a valorar.
     * */
    swapOriginDest() {
        void this.calculateAndDrawRoute(
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
        void this.calculateAndDrawRoute(
            this.currentRouteState.startHash,
            this.currentRouteState.endHash,
            this.currentRouteState.startName,
            this.currentRouteState.endName,
            this.currentRouteState.transport,
            newPref, // Nueva preferencia
            this.currentRouteState.matricula
        );
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
