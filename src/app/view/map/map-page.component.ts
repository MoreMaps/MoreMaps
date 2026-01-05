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
import {CommonModule} from '@angular/common';
import {MapUpdateService} from '../../services/map/map-update-service/map-updater';
import {MatSnackBar, MatSnackBarModule, MatSnackBarRef} from '@angular/material/snack-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatDialogModule} from '@angular/material/dialog';
import {Auth, authState} from '@angular/fire/auth';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {NavbarComponent} from '../navbar/navbar.component';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {POISearchModel} from '../../data/POISearchModel';
import {Geohash} from 'geofire-common';
import {MatIcon} from '@angular/material/icon';
import {MatFabButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import {MapCoreService} from '../../services/map/map-core-service';
import {RouteLayerService} from '../../services/map/route-layer-service';
import {BeaconLayerService} from '../../services/map/beacon-layer-service';

// --- IMPORTS PARA EDICIÓN DE RUTA (Traídos del Navbar) ---
import {RouteManagerService, RouteParams} from '../../services/map/route-manager-service';
import {PoiManagerService} from '../../services/map/poi-manager-service';
import {SpinnerSnackComponent} from '../../utils/map-widgets';

@Component({
    selector: 'app-map',
    templateUrl: './map-page.component.html',
    styleUrl: './map-page.component.scss',
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
})
export class MapPageComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('mapContainer') private mapContainer!: ElementRef<HTMLDivElement>;
    private router = inject(Router);

    protected currentPOI = signal<POISearchModel | null>(null);
    protected currentIndex = signal<number>(-1);
    private snackBar = inject(MatSnackBar);
    private authSubscription: Subscription | null = null;
    private route = inject(ActivatedRoute);
    private shouldCenterOnLocation = true;
    private routeSubscription: Subscription | null = null;
    isRouteMode: boolean = false;
    private mapCoreService = inject(MapCoreService);
    private routeLayerService = inject(RouteLayerService);
    private beaconLayerService = inject(BeaconLayerService);
    private routeManagerService = inject(RouteManagerService);
    private poiManager = inject(PoiManagerService);

    // Referencia al snackbar de carga para poder cerrarlo
    private loadingSnackBarRef: MatSnackBarRef<any> | null = null;

    private mapSubscriptions: Subscription = new Subscription();

    constructor(private mapUpdateService: MapUpdateService, private auth: Auth) {
    }

    async ngOnInit() {
        this.mapSubscriptions.add(
            this.mapUpdateService.marker$.subscribe((marker: POISearchModel) => {
                this.poiManager.selectPOI(new POISearchModel(marker.lat, marker.lon, marker.placeName));
            })
        );
        this.mapSubscriptions.add(
            this.mapUpdateService.snackbar$.subscribe((message: string) => {
                this.showSnackbar(message, 'Ok');
            })
        );
        this.mapSubscriptions.add(
            this.mapUpdateService.searchCoords$.subscribe((coords) => {
                this.poiManager.searchByCoords(coords.lat, coords.lon);
            })
        );
        this.mapSubscriptions.add(
            this.mapUpdateService.searchPlaceName$.subscribe((placeName) => {
                this.poiManager.searchByPlaceName(placeName);
            })
        );
    }

    ngAfterViewInit() {
        this.authSubscription = authState(this.auth).subscribe(async (user) => {
            if (user) {
                // Inicializar mapa base
                const mapElement = this.mapContainer.nativeElement;
                this.mapCoreService.initMap(mapElement);

                // Conectar eventos del mapa
                this.setupMapEventSubscriptions();

                // Leer URL y decidir qué pintar
                this.handleInitialLocationLogic();
            } else {
                await this.router.navigate(['']);
            }
        });
    }

    ngOnDestroy(): void {
        // 1. Limpiar suscripciones propias del componente
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
        }
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
        if (this.mapSubscriptions) {
            this.mapSubscriptions.unsubscribe();
        }

        // 2. Limpiar UI local (Snackbar de carga)
        if (this.loadingSnackBarRef) {
            this.loadingSnackBarRef.dismiss();
        }

        // 3. LIMPIEZA DE SERVICIOS GLOBALES (Managers)
        // Decimos a los singletons que limpien su estado porque el usuario está abandonando la pantalla del mapa.
        this.routeManagerService.clearRouteSession(false); // <---  Limpia ruta, capas y diálogo de ruta
        this.poiManager.clearSession(false);               // <---  Limpia marcadores y diálogo de POI

        // 4. Destruir mapa base
        this.mapCoreService.destroy();
    }

    private setupMapEventSubscriptions(): void {
        // Evento Click en el mapa
        this.mapSubscriptions.add(
            this.mapCoreService.mapClick$.subscribe(coords => {
                // El manager valida internamente si hay ruta activa
                void this.poiManager.searchByCoords(coords.lat, coords.lon);
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
        if (this.routeSubscription) this.routeSubscription.unsubscribe(); // Evitar duplicados

        this.routeSubscription = this.route.queryParams.subscribe(async params => {
            const mode = params['mode'];

            // CONSULTA DE RUTA
            if (mode === 'route') {
                const routeParams: RouteParams = {
                    startHash: params['start'],
                    endHash: params['end'],
                    startName: params['startName'],
                    endName: params['endName'],
                    transport: params['transport'],
                    preference: params['preference'],
                    matricula: params['matricula']
                };

                // Validamos integridad básica antes de llamar al Manager
                if (routeParams.startHash && routeParams.endHash) {
                    this.isRouteMode = true; // Actualizar flag local
                    this.shouldCenterOnLocation = false; // No queremos que el GPS mueva el mapa mientras vemos la ruta
                    await this.routeManagerService.loadRouteSession(routeParams);
                } else {
                }
                return; // Cortamos aquí, no evaluamos POIs ni ubicación
            }

            // CONSULTAR POI EN MAPA
            const lat = parseFloat(params['lat']);
            const lon = parseFloat(params['lon']);
            const name = params['name'];
            const hasCoords = !isNaN(lat) && !isNaN(lon);

            if (hasCoords || name) {
                this.shouldCenterOnLocation = false; // El usuario quiere ver ESTE punto, no su GPS

                // Inicialización visual
                if (hasCoords) {
                    this.mapCoreService.setView(lat, lon, 16);
                    if (name) {
                        // Es un POI guardado o compartido
                        this.poiManager.selectPOI(new POISearchModel(lat, lon, name));
                    } else {
                        // Son coordenadas puras
                        await this.poiManager.searchByCoords(lat, lon);
                    }
                } else if (name) {
                    // Es solo nombre
                    await this.poiManager.searchByPlaceName(name);
                }
            } else {
                // CASO C: MODO EXPLORACIÓN (Sin params)
                this.shouldCenterOnLocation = true;
            }

            // GESTIÓN DE UBICACIÓN DEL USUARIO (BEACON)
            // Siempre queremos ver dónde estamos, aunque no centremos la cámara
            if (this.mapUpdateService.lastKnownLocation) {
                this.beaconLayerService.setUserLocation(this.mapUpdateService.lastKnownLocation);
                if (this.shouldCenterOnLocation) {
                    this.beaconLayerService.centerOnUser(false);
                }
            } else {
                this.startLocating();
            }
        });
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

    public centerOnUser(): void {
        this.beaconLayerService.centerOnUser();
    }

    public refreshLocation(): void {
        if (this.snackBar) this.snackBar.dismiss();
        this.shouldCenterOnLocation = true;
        this.startLocating();
    }
}
