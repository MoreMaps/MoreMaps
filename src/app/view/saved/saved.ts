import {Component, computed, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {CommonModule, Location, NgOptimizedImage} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import {BreakpointObserver} from '@angular/cdk/layout';
import {Subscription} from 'rxjs';
import {geohashForLocation} from 'geofire-common';

// Modelos
import {POIModel} from '../../data/POIModel';
import {VehicleModel} from '../../data/VehicleModel';
import {RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';

// Servicios y Estrategias
import {SavedPOIStrategy} from '../../services/saved-items/savedPOIStrategy';
import {SavedVehicleStrategy} from '../../services/saved-items/saved-vehicle-strategy.service';
import {SavedRouteStrategy} from '../../services/saved-items/savedRoutesStrategy';
import {SavedItemsStrategy} from '../../services/saved-items/savedItemsStrategy';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {RouteFlowService} from '../../services/map/route-flow-service';
import {FlowPoint, FlowVehicle, RouteFlowConfig} from '../../services/map/route-flow-state';

// Componentes
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {NavbarComponent} from '../navbar/navbar.component';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {SavedPoiDialog} from './saved-poi-dialog/saved-poi-dialog';
import {SavedVehicleDialog} from './saved-vehicle-dialog/saved-vehicle-dialog';
import {SavedRouteDialog} from './saved-route-dialog/saved-route-dialog';
import {SpinnerSnackComponent} from '../../utils/map-widgets';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';

// PATRÓN ITERATOR
import {IterableCollection, PagedIterator} from '../../utils/paginator/iterator.interface';
import {ConcretePagedCollection} from '../../utils/paginator/concrete-collections';

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
        SavedVehicleStrategy,
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
    private location = inject(Location);
    private activeDialogRef: MatDialogRef<any> | null = null;
    private breakpointSubscription: Subscription | null = null;
    private queryParamsSubscription: Subscription | null = null;
    private routeFlowService = inject(RouteFlowService);
    private vehicleRepo = inject(VEHICLE_REPOSITORY);
    private dialogActionSubscription: Subscription | null = null;

    // Estado de la vista
    isDesktop = signal(false);

    // Estrategias
    private strategies: Record<string, SavedItemsStrategy> = {
        'lugares': inject(SavedPOIStrategy),
        'vehiculos': inject(SavedVehicleStrategy),
        'rutas': inject(SavedRouteStrategy)
    };
    currentStrategy = computed(() => this.strategies[this.selectedType()]);

    // ESTADO PRINCIPAL
    selectedType = signal<ItemType>('lugares');
    items = signal<any[]>([]); // Mantenemos la lista completa para comprobaciones de longitud
    selectedItem: POIModel | VehicleModel | RouteModel | any | null = null;
    vehicleMap = signal<Map<string, string>>(new Map());

    // --- PATRÓN ITERATOR ---
    // Instancia del iterador
    private iterator: PagedIterator<any> | null = null;

    // Signals sincronizados con el iterador para la Vista
    readonly itemsPerPage = signal(5);
    currentPage = signal(1);
    totalPages = signal(1);
    paginatedItems = signal<any[]>([]); // Ahora es un signal de escritura, no computed

    // Transformación para mostrar nombres (Computed sobre los items paginados actuales)
    paginatedItemsWithNames = computed(() => {
        const items = this.paginatedItems();
        return items.map(item => ({
            item,
            displayName: this.currentStrategy().getDisplayName(item)
        }));
    });

    selectedItemDisplayName = computed(() => {
        if (!this.selectedItem) return '';
        return this.currentStrategy().getDisplayName(this.selectedItem);
    });

    emptyMessage = computed(() => this.currentStrategy().getEmptyMessage());

    private isUpdating = false;

    constructor() {
        // Recuperar preferencias
        const savedType = localStorage.getItem('user_preference_saved_tab');
        if (savedType) {
            this.selectedType.set(savedType as ItemType);
        }

        // Efecto para guardar la pestaña actual
        effect(() => {
            const currentType = this.selectedType();
            localStorage.setItem('user_preference_saved_tab', currentType);
        });

        // Responsive Observer
        this.breakpointSubscription = this.breakpointObserver
            .observe('(min-width: 1025px)')
            .subscribe(result => {
                const isDesktopNow = result.matches;
                this.isDesktop.set(isDesktopNow);

                if (!isDesktopNow && this.selectedItem) {
                    setTimeout(() => {
                        if (this.selectedItem) {
                            this.openDialogForItem(this.selectedItem);
                        }
                    }, 0);
                } else if (isDesktopNow) {
                    this.dialog.closeAll();
                }
            });
    }

    ngOnInit(): void {
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

            const allowStorageFallback = !idParam && !typeParam;
            this.fetchDataWithLoading(allowStorageFallback, idParam).then();
        });
    }

    ngOnDestroy(): void {
        this.clearLoadingState();

        if (this.dialogActionSubscription) {
            this.dialogActionSubscription.unsubscribe();
        }

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

        // Guardar página actual
        localStorage.setItem(`user_preference_page_${this.selectedType()}`, this.currentPage().toString());

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
        // 1. Cargar datos crudos
        const data = await this.currentStrategy().loadItems();
        this.items.set(data);

        // 2. Crear la Colección y el Iterador (Patrón Iterator)
        const collection: IterableCollection<any> = new ConcretePagedCollection(data, this.itemsPerPage());
        this.iterator = collection.createIterator();

        // 3. Restaurar página guardada si aplica
        const storageKey = `user_preference_page_${this.selectedType()}`;
        const savedPage = localStorage.getItem(storageKey);
        if (savedPage) {
            // Usamos el método jumpToPage del iterador concreto
            // Necesitamos hacer casting o asumir que es ConcretePagedIterator si la interfaz no tiene jumpToPage,
            // pero tu clase concreta sí lo tiene.
            if (this.iterator && 'jumpToPage' in this.iterator) {
                (this.iterator as any).jumpToPage(parseInt(savedPage, 10));
            }
        }

        // 4. Sincronizar estado inicial del iterador con la vista
        this.syncIteratorState();

        if (this.selectedType() === 'rutas') {
            await this.loadVehicleAliases();
        }

        await this.checkAndSelectFromParams(data, specificId, allowStorageFallback);
    }

    /**
     * Sincroniza los signals de la UI con el estado actual del iterador.
     */
    private syncIteratorState(): void {
        if (this.iterator) {
            this.paginatedItems.set(this.iterator.getCurrent());
            this.currentPage.set(this.iterator.getCurrentPageNumber());
            this.totalPages.set(this.iterator.getTotalPages());
        } else {
            this.paginatedItems.set([]);
            this.currentPage.set(1);
            this.totalPages.set(1);
        }
    }

    private async checkAndSelectFromParams(items: any[], urlId: string | undefined, allowStorageFallback: boolean): Promise<void> {
        if (this.isUpdating) return;

        let targetId = urlId;

        if (!targetId && allowStorageFallback) {
            targetId = localStorage.getItem('user_preference_save   d_item_id')?.toString();
        }

        if (targetId && items.length > 0) {
            const foundItem = items.find(item => this.getItemId(item) === targetId);

            if (foundItem) {
                this.selectItem(foundItem);

                // Calcular página para el salto (necesitamos saber el índice global)
                const index = items.indexOf(foundItem);
                const page = Math.floor(index / this.itemsPerPage()) + 1;

                // Usar el iterador para saltar
                if (this.iterator && 'jumpToPage' in this.iterator) {
                    (this.iterator as any).jumpToPage(page);
                    this.syncIteratorState();
                }

                // Limpiar URL
                if (urlId || this.route.snapshot.queryParams['type']) {
                    const urlTree = this.router.createUrlTree([], {relativeTo: this.route, queryParams: {}});
                    this.location.replaceState(urlTree.toString());
                }
            } else if (urlId) {
                this.snackBar.open('Elemento no encontrado o aún no disponible.', 'Ok', {duration: 3000});
            }
        }
    }

    private async loadVehicleAliases(): Promise<void> {
        try {
            const vehicles = await this.vehicleRepo.getVehicleList();
            const map = new Map<string, string>();
            vehicles.forEach(v => map.set(v.matricula, v.alias));
            this.vehicleMap.set(map);
        } catch (error) {
            console.error('Error cargando alias de vehículos', error);
        }
    }

    getRouteTransportLabel(item: any): string {
        if (this.selectedType() !== 'rutas' || !item) return '';
        const route = item as RouteModel;

        if (route.transporte === TIPO_TRANSPORTE.VEHICULO && route.matricula) {
            const alias = this.vehicleMap().get(route.matricula);
            if (alias) return `En ${alias}`;
        }
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
                return (item as any).id();
            default:
                return null;
        }
    }

    selectType(type: ItemType): void {
        if (this.selectedType() === type) return;

        this.selectedType.set(type);
        // Reset manual
        this.currentPage.set(1);
        this.deselectItem();
        void this.fetchDataWithLoading(false);
    }

    private async fetchDataWithLoading(allowStorageFallback: boolean, specificId?: string): Promise<void> {
        this.items.set([]); // Limpiar lista visualmente mientras carga
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
            this.paginatedItems.set([]); // Asegurar limpieza del iterador visual
        } finally {
            this.clearLoadingState();
        }
    }

    // --- SELECCIÓN Y DIÁLOGOS ---

    selectItem(item: any): void {
        this.selectedItem = item;
        const id = this.getItemId(item);
        if (id) localStorage.setItem('user_preference_saved_item_id', id);

        if (!this.isDesktop()) {
            this.dialog.closeAll();
            this.openDialogForItem(item);
        }
    }

    private openDialogForItem(item: any): void {
        if (this.activeDialogRef) return;
        if (this.dialog.openDialogs.length > 0) this.dialog.closeAll();

        const currentId = this.getItemId(item);
        // Buscar en la lista completa (this.items) no solo en la página actual
        const freshItem = this.items().find(i => this.getItemId(i) === currentId) || item;

        const dialogConfig = {
            panelClass: 'saved-item-dialog-panel',
            autoFocus: false,
            width: '400px',
            maxWidth: '90vw',
            data: {
                item: item,
                displayName: this.currentStrategy().getDisplayName(freshItem),
                displayTransport: this.getRouteTransportLabel(freshItem),
            }
        };

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

        if (this.activeDialogRef) {
            const componentInstance = this.activeDialogRef.componentInstance;

            if (componentInstance && 'actionEvent' in componentInstance) {
                this.dialogActionSubscription = (componentInstance as any).actionEvent.subscribe((result: any) => {
                    // Normalizamos el resultado que viene del EventEmitter
                    const action = result.action || result;
                    const payload = result.payload;

                    if (action === 'update') {
                        // Pasamos el payload (item nuevo) al manejador
                        void this.handleDialogActions('update', payload);
                    } else {
                        this.activeDialogRef?.close(result);
                    }
                });
            }

            this.activeDialogRef.afterClosed().subscribe((result) => {
                if (this.dialogActionSubscription) {
                    this.dialogActionSubscription.unsubscribe();
                    this.dialogActionSubscription = null;
                }

                void this.processDialogResult(result);
                this.activeDialogRef = null;
            });
        }
    }

    private async processDialogResult(result: any) {
        if (!result || result.ignore) {
            if (!this.isDesktop()) this.deselectItem();
            return;
        }

        const actionString = (typeof result === 'string') ? result : result.action;
        const payload = (typeof result === 'object') ? result.payload : undefined;

        await this.handleDialogActions(actionString, payload);

        if (actionString !== 'update') this.deselectItem();
    }

    async handleDialogActions(action: string | undefined, payload?: any): Promise<void> {
        switch (action) {
            case 'delete':
                this.deselectItem();
                await this.loadItems(false); // Recargará y creará nuevo iterador
                break;
            case 'update':
                this.isUpdating = true;
                try {
                    await this.loadItems(false);
                    let targetItem = null;

                    if (payload) {
                        const newId = this.getItemId(payload);
                        targetItem = this.items().find(i => this.getItemId(i) === newId);
                    } else if (this.selectedItem) {
                        const oldId = this.getItemId(this.selectedItem);
                        targetItem = this.items().find(i => this.getItemId(i) === oldId);
                    }

                    if (targetItem) {
                        this.selectedItem = targetItem;
                        const finalId = this.getItemId(targetItem);
                        if (finalId) localStorage.setItem('user_preference_saved_item_id', finalId);
                    } else {
                        this.deselectItem();
                    }
                } finally {
                    this.isUpdating = false;
                }
                break;
            case 'showOnMap':
                void this.handleShowOnMap();
                break;
            case 'route-from':
                await this.initRouteFlow({fixedOrigin: payload || this.selectedItem});
                break;
            case 'route-to':
                await this.initRouteFlow({fixedDest: payload || this.selectedItem});
                break;
            case 'route-vehicle':
                await this.initRouteFlow({fixedVehicle: payload || this.selectedItem});
                break;
        }
    }

    private async handleShowOnMap(): Promise<void> {
        if (this.selectedType() === 'lugares') {
            const poi = this.selectedItem as POIModel;
            void this.router.navigate(['/map'], {
                queryParams: {lat: poi.lat, lon: poi.lon, name: poi.alias}
            });
        } else if (this.selectedType() === 'rutas') {
            const route = this.selectedItem as RouteModel;
            let startName = route.nombre_origen;
            let endName = route.nombre_destino;

            try {
                const savedPois = await this.strategies['lugares'].loadItems() as POIModel[];
                const originPoi = savedPois.find(p => p.geohash === route.geohash_origen);
                if (originPoi?.alias) startName = originPoi.alias;
                const destPoi = savedPois.find(p => p.geohash === route.geohash_destino);
                if (destPoi?.alias) endName = destPoi.alias;
            } catch (e) {
                console.warn("Error al resolver alias en ruta: ", e);
            }

            void this.router.navigate(['/map'], {
                queryParams: {
                    mode: 'route',
                    start: route.geohash_origen,
                    end: route.geohash_destino,
                    startName: startName,
                    endName: endName,
                    transport: route.transporte,
                    preference: route.preferencia,
                    matricula: route.matricula
                }
            });
        }
    }

    deselectItem(): void {
        this.selectedItem = null;
        localStorage.removeItem('user_preference_saved_item_id');
    }

    // --- PAGINACIÓN (Delegada al Iterador) ---

    previousPage(): void {
        if (this.iterator && this.iterator.hasPrevious()) {
            // El iterador actualiza su estado interno
            this.iterator.getPrevious();
            // Nosotros actualizamos la vista consultando al iterador
            this.syncIteratorState();
        }
    }

    nextPage(): void {
        if (this.iterator && this.iterator.hasMore()) {
            this.iterator.getNext();
            this.syncIteratorState();
        }
    }

    async toggleFavorite(item: any, event: Event): Promise<void> {
        event.stopPropagation();
        const success = await this.currentStrategy().toggleFavorite(item);
        if (success) {
            const itemName = this.currentStrategy().getDisplayName(item);
            const message = item.pinned
                ? `Se ha fijado ${itemName}.`
                : `${itemName} ya no está fijado.`;
            this.showSnackbar(message);
            // Recargar items para refrescar orden y estado (recreará el iterador)
            await this.loadItems(false);
        }
    }

    private showSnackbar(msg: string): void {
        this.snackBar.open(msg, 'Ok', {duration: 5000, horizontalPosition: 'left', verticalPosition: 'bottom'});
    }

    // LÓGICA DE RUTA (Route Flow)

    async initRouteFlow(prefilled: { fixedOrigin?: POIModel, fixedDest?: POIModel, fixedVehicle?: VehicleModel }) {
        const config: RouteFlowConfig = {
            fixedOrigin: prefilled.fixedOrigin ? this.mapToFlowPoint(prefilled.fixedOrigin) : undefined,
            fixedDest: prefilled.fixedDest ? this.mapToFlowPoint(prefilled.fixedDest) : undefined,
            fixedVehicle: prefilled.fixedVehicle ? this.mapToFlowVehicle(prefilled.fixedVehicle) : undefined
        };

        const result = await this.routeFlowService.startRouteFlow(config);

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

    private mapToFlowPoint(item: any): FlowPoint {
        const name = this.strategies['lugares'].getDisplayName(item);
        return {
            name: name,
            lat: item.lat,
            lon: item.lon,
            hash: item.geohash
        };
    }

    private mapToFlowVehicle(item: any): FlowVehicle {
        const name = this.strategies['vehiculos'].getDisplayName(item);
        return {
            matricula: item.matricula,
            alias: name,
        }
    }

    protected readonly Math = Math;
}
