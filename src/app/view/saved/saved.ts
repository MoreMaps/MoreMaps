import {Component, computed, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {CommonModule, Location, NgOptimizedImage} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import {BreakpointObserver} from '@angular/cdk/layout';

// Modelos
import {POIModel} from '../../data/POIModel';
import {VehicleModel} from '../../data/VehicleModel';

// Servicios y Estrategias
import {SavedPOIStrategy} from '../../services/saved-items/savedPOIStrategy';
import {SavedVehiclesStrategy} from '../../services/saved-items/savedVehiclesStrategy';
import {SavedRouteStrategy} from '../../services/saved-items/savedRoutesStrategy';
import {SavedItemsStrategy} from '../../services/saved-items/savedItemsStrategy';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';

// Componentes
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {NavbarComponent} from '../navbar/navbar.component';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {SavedPoiDialog} from './saved-poi-dialog/saved-poi-dialog';
import {SavedVehicleDialog} from './saved-vehicle-dialog/saved-vehicle-dialog';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {Subscription} from 'rxjs';
import {RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {geohashForLocation} from 'geofire-common';
import {SavedRouteDialog} from './saved-route-dialog/saved-route-dialog';
import {RouteFlowService} from '../../services/map/route-flow-service';
import {SpinnerSnackComponent} from '../../utils/map-widgets';
import {FlowPoint, RouteFlowConfig} from '../../services/map/route-flow-state';

type ItemType = 'lugares' | 'vehiculos' | 'rutas';

@Component({
    selector: 'app-saved-items',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        ThemeToggleComponent,
        NavbarComponent,
        ProfileButtonComponent,
        NgOptimizedImage,
        SavedPoiDialog,
        SavedVehicleDialog,
        SavedRouteDialog
    ],
    providers: [
        SavedPOIStrategy,
        SavedVehiclesStrategy,
        SavedRouteStrategy
    ],
    templateUrl: './saved.html',
    styleUrls: ['./saved.scss'],
})
export class SavedItemsComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    private activeSnackRef: MatSnackBarRef<any> | null = null;
    private loadingTimeout: any = null;
    private route = inject(ActivatedRoute);
    private dialog = inject(MatDialog);
    private breakpointObserver = inject(BreakpointObserver);
    private location = inject(Location)
    private activeDialogRef: MatDialogRef<any> | null = null;
    private breakpointSubscription: Subscription | null = null;
    private queryParamsSubscription: Subscription | null = null;
    private routeFlowService = inject(RouteFlowService);
    private vehicleRepo = inject(VEHICLE_REPOSITORY);

    isDesktop = signal(false);

    private strategies: Record<string, SavedItemsStrategy> = {
        'lugares': inject(SavedPOIStrategy),
        'vehiculos': inject(SavedVehiclesStrategy),
        'rutas': inject(SavedRouteStrategy)
    };

    // ESTADO
    selectedType = signal<ItemType>('lugares');
    items = signal<any[]>([]); // Lista genérica

    selectedItem: POIModel | VehicleModel | RouteModel | any | null = null;

    // Paginación
    currentPage = signal(1);
    itemsPerPage = signal(4);
    totalPages = computed(() => {
        let itemSnap = this.items();
        if (!itemSnap) return 1;
        const total = Math.ceil(itemSnap.length / this.itemsPerPage());
        return total === 0 ? 1 : total;
    });

    currentStrategy = computed(() => this.strategies[this.selectedType()]);

    vehicleMap = signal<Map<string, string>>(new Map());

    constructor() {
        const savedType = localStorage.getItem('user_preference_saved_tab');
        if (savedType) {
            this.selectedType.set(savedType as ItemType);
        }

        const savedPage = localStorage.getItem('user_preference_saved_page');
        if (savedPage) {
            this.currentPage.set(parseInt(savedPage, 10));
        }

        // Guardar la pestaña actual
        effect(() => {
            const currentType = this.selectedType();
            localStorage.setItem('user_preference_saved_tab', currentType);
        });

        this.breakpointSubscription = this.breakpointObserver
            .observe('(min-width: 1025px)')
            .subscribe(result => {
                const isDesktopNow = result.matches
                this.isDesktop.set(isDesktopNow);

                if (!isDesktopNow && this.selectedItem) {
                    // Si pasamos a móvil y hay algo seleccionado, abrir diálogo
                    setTimeout(() => {
                        if (this.selectedItem) {
                            this.openDialogForItem(this.selectedItem);
                        }
                    }, 0); // timeout a 0 lo mueve al final de la cola
                } else if (isDesktopNow) {
                    // Si pasamos a desktop, cerrar diálogos (se verá en el panel lateral)
                    this.dialog.closeAll();

                }
            });
    }

    ngOnInit(): void {
        // Reaccionar a cambios en la URL
        this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
            const typeParam = params['type'];
            const idParam = params['id'];

            if (typeParam && this.strategies[typeParam]) {
                if (this.selectedType() !== typeParam) {
                    this.selectedType.set(typeParam as ItemType);
                    this.deselectItem();
                } else if (idParam) {
                    this.deselectItem();
                }
            }

            // Determinar si permitimos el fallback a localStorage
            //   Si la URL trae parámetros (type o id), la navegación es explícita y NO debemos usar el histórico.
            //   Si la URL está limpia, permitimos recuperar la última selección.
            const allowStorageFallback = !idParam && !typeParam;

            // Cargar datos
            this.fetchDataWithLoading(allowStorageFallback, idParam).then();
        });
    }

    ngOnDestroy(): void {
        this.clearLoadingState()

        if (this.breakpointSubscription) {
            this.breakpointSubscription.unsubscribe();
            this.breakpointSubscription = null;
        }

        if (this.queryParamsSubscription) {
            this.queryParamsSubscription.unsubscribe();
            this.queryParamsSubscription = null;
        }

        if (this.activeDialogRef) {
            this.activeDialogRef.close();
            this.activeDialogRef = null;
        }

        localStorage.setItem('user_preference_saved_page', this.currentPage().toString());

        if (this.selectedItem) {
            const id = this.getItemId(this.selectedItem);
            if (id) localStorage.setItem('user_preference_saved_item_id', id);
        } else {
            localStorage.removeItem('user_preference_saved_item_id');
        }
        this.selectedItem = null;
    }

    private clearLoadingState(): void {
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        if (this.activeSnackRef) {
            this.activeSnackRef.dismiss();
            this.activeSnackRef = null;
        }
    }

    // --- CARGA DE DATOS ---

    async loadItems(allowStorageFallback: boolean, specificId?: string): Promise<void> {
        const items = await this.currentStrategy().loadItems();
        this.items.set(items);

        if (this.selectedType() === 'rutas') {
            await this.loadVehicleAliases();
        }

        // Validación de página
        const realTotalPages = Math.ceil(items.length / this.itemsPerPage()) || 1;
        if (this.currentPage() > realTotalPages) {
            this.currentPage.set(realTotalPages);
        }

        // Llamamos a la selección pasándole explícitamente si puede usar storage
        await this.checkAndSelectFromParams(items, specificId, allowStorageFallback);
    }

    private async checkAndSelectFromParams(items: any[], urlId: string | undefined, allowStorageFallback: boolean): Promise<void> {
        let targetId = urlId;

        // SOLO miramos en localStorage si no hay ID de URL y tenemos permiso explícito (navegación limpia)
        if (!targetId && allowStorageFallback) {
            targetId = localStorage.getItem('user_preference_saved_item_id')?.toString();
        }

        if (targetId && items.length > 0) {
            const foundItem = items.find(item => this.getItemId(item) === targetId);

            if (foundItem) {
                this.selectItem(foundItem);

                const index = items.indexOf(foundItem);
                const page = Math.floor(index / this.itemsPerPage()) + 1;
                this.currentPage.set(page);

                // Limpiar URL solo si venía con parámetros para dejarla limpia
                if (urlId || this.route.snapshot.queryParams['type']) {
                    const urlTree = this.router.createUrlTree([], {
                        relativeTo: this.route,
                        queryParams: {}
                    });
                    this.location.replaceState(urlTree.toString());
                }
            } else {
                // Caso importante: Si venía un ID en la URL, pero no se encontró (ej. retardo en BD),
                // NO seleccionamos nada. No hacemos fallback a localStorage para evitar confusión.
                console.warn(`Item con id ${targetId} no encontrado en la lista cargada.`);
                this.snackBar.open('Elemento no encontrado o aún no disponible.', 'Ok', {duration: 3000});
            }
        }
    }

    private async loadVehicleAliases(): Promise<void> {
        try {
            const vehicles = await this.vehicleRepo.getVehicleList();
            const map = new Map<string, string>();

            vehicles.forEach(v => {
                // Mapeamos matrícula -> alias
                const displayName = v.alias;
                map.set(v.matricula, displayName);
            });

            this.vehicleMap.set(map);
        } catch (error) {
            console.error('Error cargando alias de vehículos', error);
        }
    }

    getRouteTransportLabel(item: any): string {
        // Validación de seguridad
        if (this.selectedType() !== 'rutas' || !item) return '';

        const route = item as RouteModel;

        // Si es vehículo y tiene matrícula
        if (route.transporte === TIPO_TRANSPORTE.VEHICULO && route.matricula) {
            const alias = this.vehicleMap().get(route.matricula);
            if (alias) {
                return `En ${alias}`;
            }
        }

        // Fallback al texto por defecto ("En coche", "A pie", etc.)
        return route.transportLabel();
    }

    private getItemId(item: any): string | null {
        if (!item) return null;
        switch (this.selectedType()) {
            case 'lugares':
                return (item as POIModel).geohash;
            case 'vehiculos':
                return (item as VehicleModel).matricula;
            case 'rutas':
                return (item as any).id(); // RouteModel.id()
            default:
                return null;
        }
    }

    selectType(type: ItemType): void {
        if (this.selectedType() === type) return;

        this.selectedType.set(type);
        this.currentPage.set(1);

        // Cambio manual: limpiar selección y no permitir fallback a storage
        this.deselectItem();
        void this.fetchDataWithLoading(false);
    }

    private async fetchDataWithLoading(allowStorageFallback: boolean, specificId?: string): Promise<void> {
        this.items.set([]);
        if (this.activeSnackRef) this.activeSnackRef.dismiss();

        this.loadingTimeout = setTimeout(() => {
            this.activeSnackRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
                horizontalPosition: 'left',
                verticalPosition: 'bottom',
                duration: 0
            });
        }, 300);

        try {
            await this.loadItems(allowStorageFallback, specificId);
        } catch (error) {
            if (error instanceof SessionNotActiveError) {
                await this.router.navigate(['']);
                return;
            }
            console.error('Error loading items:', error);
            this.items.set([]);
        } finally {
            this.clearLoadingState();
        }
    }

    // --- SELECCIÓN Y DIÁLOGOS ---

    selectItem(item: any): void {
        this.selectedItem = item;

        const id = this.getItemId(item);
        if (id) localStorage.setItem('user_preference_saved_item_id', id);

        // Si es móvil, abrimos diálogo. Si es Desktop, se muestra incrustado
        if (!this.isDesktop()) {
            this.dialog.closeAll(); // cerramos cualquier diálogo previo
            this.openDialogForItem(item);
        }
    }

    private openDialogForItem(item: any): void {
        if (this.activeDialogRef) return;

        // Si hay otros diálogos, forzamos su cierre para limpiar la pantalla.
        if (this.dialog.openDialogs.length > 0) {
            this.dialog.closeAll();
        }

        const currentId = this.getItemId(item);
        const freshItem = this.items().find(i => this.getItemId(i) === currentId) || item;

        const dialogConfig = {
            panelClass: 'saved-item-dialog-panel',
            autoFocus: false,
            width: '400px',
            maxWidth: '90vw',
            data: {
                item: item,
                displayName: this.getDisplayName(freshItem),
                displayTransport: this.getRouteTransportLabel(freshItem),
            }
        };

        // Aquí usamos el switch type, es más limpio que instanceof para decidir el componente
        switch (this.selectedType()) {
            case 'lugares':
                this.activeDialogRef = this.dialog.open(SavedPoiDialog, dialogConfig);
                break;
            case 'vehiculos':
                this.activeDialogRef = this.dialog.open(SavedVehicleDialog, dialogConfig);
                break;
            case 'rutas':
                this.activeDialogRef = this.dialog.open(SavedRouteDialog, dialogConfig);
                break;
        }

        // Suscribirse siempre al resultado, sea cual sea el tipo
        if (this.activeDialogRef?.componentInstance) {
            const instance = this.activeDialogRef?.componentInstance as any;

            if (instance.actionEvent) {
                instance.actionEvent.subscribe(async (action: string) => {
                   if (action === 'update') {
                       await this.handleDialogActions('update');
                   }
                });
            }
            if (this.activeDialogRef) {
                this.activeDialogRef.afterClosed().subscribe((result) => {
                    this.processDialogResult(result)
                    this.activeDialogRef = null;
                });
            }
        }
    }

    private async processDialogResult(result: any) {
        if (result && !result.ignore) {
            await this.handleDialogActions(result);

            if(result !== 'update') this.deselectItem();

        } else if (!result?.ignore) {
            if (!this.isDesktop()) {
                this.deselectItem();
            }
        }
    }

    async handleDialogActions(action: string | undefined): Promise<void> {
        switch (action) {
            case 'delete':
                this.deselectItem();
                await this.loadItems(false); // Recargar lista
                break;
            case 'update':
                // Recargar lista para reflejar cambios (ej. alias)
                await this.loadItems(false);

                // Actualizar la referencia del item seleccionado con los nuevos datos
                if (this.selectedItem) {
                    const currentId = this.getItemId(this.selectedItem);
                    const updatedItem = this.items().find(item => this.getItemId(item) === currentId);

                    if (updatedItem) {
                        // Actualizamos la referencia del item seleccionado
                        this.selectedItem = updatedItem;
                        // Si estamos en desktop, Angular detectará el cambio y actualizará la vista
                        // Si estamos en móvil, el diálogo YA tiene los datos actualizados internamente
                        // y NO lo cerramos (el diálogo maneja su propia actualización)
                    }
                }
                break;
            case 'showOnMap':
                if (this.selectedItem && this.selectedType() === 'lugares') {
                    const poi = this.selectedItem as POIModel;
                    void this.router.navigate(['/map'], {
                        queryParams: {lat: poi.lat, lon: poi.lon, name: poi.alias}
                    });
                } else if (this.selectedType() === 'rutas') {
                    const route = this.selectedItem as RouteModel;
                    // Navegamos al mapa reconstruyendo los parámetros de la ruta
                    void this.router.navigate(['/map'], {
                        queryParams: {
                            mode: 'route',
                            start: route.geohash_origen,
                            end: route.geohash_destino,
                            startName: route.nombre_origen,
                            endName: route.nombre_destino,
                            transport: route.transporte,
                            preference: route.preferencia,
                            matricula: route.matricula
                        }
                    });
                }
                break;
            case 'route-from': // Origen fijado (Lugar)
                await this.initRouteFlow({fixedOrigin: this.selectedItem});
                break;
            case 'route-to': // Destino fijado (Lugar)
                await this.initRouteFlow({fixedDest: this.selectedItem});
                break;
            case 'route-vehicle': // Vehículo fijado
                await this.initRouteFlow({fixedVehicle: this.selectedItem});
                break;
        }
    }

    deselectItem(): void {
        this.selectedItem = null;
        localStorage.removeItem('user_preference_saved_item_id');
    }

    getDisplayName(item: any): string {
        console.log(this.currentStrategy());
        console.log(this.currentStrategy().getDisplayName(item));
        return this.currentStrategy().getDisplayName(item);
    }

    // --- UTILIDADES ---

    paginatedItems = computed(() => {
        const start = (this.currentPage() - 1) * this.itemsPerPage();
        const end = start + this.itemsPerPage();
        const itemSnap = this.items();
        if (!itemSnap) return [];
        return itemSnap.slice(start, end);
    });

    previousPage(): void {
        if (this.currentPage() > 1) this.currentPage.set(this.currentPage() - 1);
    }

    nextPage(): void {
        if (this.currentPage() < this.totalPages()) this.currentPage.set(this.currentPage() + 1);
    }

    emptyMessage = computed(() => this.currentStrategy().getEmptyMessage());

    async toggleFavorite(item: any, event: Event): Promise<void> {
        event.stopPropagation();
        const success = await this.currentStrategy().toggleFavorite(item);
        if (success) {
            const message = item.pinned
                ? `Se ha fijado ${this.getDisplayName(item)}.`
                : `${this.getDisplayName(item)} ya no está fijado.`;
            this.showSnackbar(message);
            await this.loadItems(false);
        }
    }

    private showSnackbar(msg: string): void {
        this.snackBar.open(msg, 'Ok', {duration: 5000, horizontalPosition: 'left', verticalPosition: 'bottom'});
    }

    // LÓGICA DE RUTA ---------------------

    /**
     * Inicia el flujo de cálculo de ruta saltando pasos si hay datos fijos.
     */
    async initRouteFlow(prefilled: { fixedOrigin?: any, fixedDest?: any, fixedVehicle?: any }) {

        // Configurar
        const config: RouteFlowConfig = {
            fixedOrigin: prefilled.fixedOrigin ? this.mapToFlowPoint(prefilled.fixedOrigin) : undefined,
            fixedDest: prefilled.fixedDest ? this.mapToFlowPoint(prefilled.fixedDest) : undefined,
            fixedVehicle: prefilled.fixedVehicle
        };

        //
        // ¡Ejecutar una sola línea de lógica!
        const result = await this.routeFlowService.startRouteFlow(config);

        // Navegar
        if (result) {
            const startHash = result.origin!.hash || geohashForLocation([result.origin!.lat, result.origin!.lon], 7);
            const endHash = result.destination!.hash || geohashForLocation([result.destination!.lat, result.destination!.lon], 7);

            const routeParams = {
                mode: 'route',
                start: startHash,
                startName: result.origin!.name,
                end: endHash,
                endName: result.destination!.name,
                transport: result.transport,
                preference: result.preference,
                matricula: result.matricula
            };
            const cleanParams = JSON.parse(JSON.stringify(routeParams));
            await this.router.navigate(['/map'], {queryParams: cleanParams});
        }
    }

    /**
     * Convierte un ítem guardado (POI, Vehículo, etc.) al formato FlowPoint
     * que necesita el servicio de rutas.
     */
    private mapToFlowPoint(item: any): FlowPoint {
        // Usamos tu estrategia existente para obtener el nombre correcto (alias o placeName)
        const name = this.getDisplayName(item);

        return {
            name: name,
            lat: item.lat,
            lon: item.lon,
            hash: item.geohash // Algunos ítems como vehículos pueden no tener geohash, será undefined
        };
    }

    protected readonly Math = Math;
}
