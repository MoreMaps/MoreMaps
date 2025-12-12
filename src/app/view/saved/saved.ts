import {Component, computed, effect, inject, OnDestroy, signal} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {Auth} from '@angular/fire/auth';
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
import {POIService} from '../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {VEHICLE_REPOSITORY} from '../../services/Vehicle/VehicleRepository';
import {VehicleDB} from '../../services/Vehicle/VehicleDB';
import {VehicleService} from '../../services/Vehicle/vehicle.service';

// Componentes
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {NavbarComponent} from '../navbar/navbar.component';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {SpinnerSnackComponent} from '../map/map';
import {SavedPoiDialog} from './saved-poi-dialog/saved-poi-dialog';
import {SavedVehicleDialog} from './saved-vehicle-dialog/saved-vehicle-dialog';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {MapSearchService} from '../../services/map-search-service/map-search.service';
import {firstValueFrom} from 'rxjs';
import {RouteOptionsDialogComponent} from '../route/route-options-dialog/route-options-dialog';
import {PointConfirmationDialog} from '../navbar/point-confirmation-dialog/point-confirmation-dialog';
import {PlaceNameSearchDialogComponent} from '../navbar/placename-search-dialog/placename-search-dialog';
import {CoordsSearchDialogComponent} from '../navbar/coords-search-dialog/coords-search-dialog';
import {AddPoiDialogComponent, AddPoiMethod} from '../navbar/add-poi-dialog/add-poi-dialog';
import {POISearchModel} from '../../data/POISearchModel';
import {RouteOriginDialog, RouteOriginMethod} from '../route/route-origin-dialog/route-origin-dialog';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {geohashForLocation} from 'geofire-common';
import {SavedItemSelector} from '../../services/saved-items/saved-item-selector-dialog/savedSelectorData';

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
        SavedVehicleDialog
    ],
    templateUrl: './saved.html',
    styleUrls: ['./saved.scss'],
    providers: [
        POIService,
        VehicleService,
        MapSearchService,
        {provide: POI_REPOSITORY, useClass: POIDB},
        {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
        SavedPOIStrategy,
        SavedVehiclesStrategy,
        SavedRouteStrategy
    ]
})
export class SavedItemsComponent implements OnDestroy {
    private auth = inject(Auth);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    private activeSnackRef: MatSnackBarRef<any> | null = null;
    private loadingTimeout: any = null;
    private route = inject(ActivatedRoute);
    private dialog = inject(MatDialog);
    private breakpointObserver = inject(BreakpointObserver);
    private mapSearchService = inject(MapSearchService);

    isDesktop = signal(false);

    private strategies: Record<string, SavedItemsStrategy> = {
        'lugares': inject(SavedPOIStrategy),
        'vehiculos': inject(SavedVehiclesStrategy),
        'rutas': inject(SavedRouteStrategy)
    };

    // ESTADO
    selectedType = signal<ItemType>('lugares');
    items = signal<any[]>([]); // Lista genérica

    // REFACTORIZADO: Ya no usamos selectedPOI ni selectedVehicle por separado
    selectedItem: POIModel | VehicleModel | any | null = null;

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

    constructor() {
        const savedType = localStorage.getItem('user_preference_saved_tab');
        if (savedType) {
            this.selectedType.set(savedType as ItemType);
        }
        this.fetchDataWithLoading();

        effect(() => {
            const currentType = this.selectedType();
            localStorage.setItem('user_preference_saved_tab', currentType);
        });

        this.breakpointObserver.observe('(min-width: 1025px)').subscribe(result => {
            const isDesktopNow = result.matches
            this.isDesktop.set(isDesktopNow);

            if (!isDesktopNow && this.selectedItem) {
                // Si pasamos a móvil y hay algo seleccionado, abrir diálogo
                this.openDialogForItem(this.selectedItem);
            } else if (isDesktopNow) {
                // Si pasamos a desktop, cerrar diálogos (se verá en el panel lateral)
                this.dialog.closeAll();
            }
        });
    }

    ngOnDestroy(): void {
        this.clearLoadingState()
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

    async loadItems(): Promise<void> {
        try {
            await this.checkAndSelectFromParams();
        } catch (error) {
            if (error instanceof SessionNotActiveError) {
                this.router.navigate(['']);
                return;
            }
            console.error('Error loading items:', error);
            this.items.set([]);
        }
    }

    private async checkAndSelectFromParams(): Promise<void> {
        const params = this.route.snapshot.queryParams;
        const type: ItemType = params['type'];
        const targetId: string = params['id'];

        if (type && this.strategies[type]) {
            this.selectedType.set(type);
        }

        // Carga agnóstica del tipo
        const items = await this.currentStrategy().loadItems();
        this.items.set(items);

        if (targetId && items) {
            // Buscamos el item. La estrategia sabe cómo comparar IDs?
            // Si no, lo hacemos manual según el tipo, pero mantenemos la lógica agrupada.
            const foundItem = items.find(item => {
                if (this.selectedType() === 'lugares') return (item as POIModel).geohash === targetId;
                if (this.selectedType() === 'vehiculos') return (item as VehicleModel).matricula === targetId;
                return false; // TODO rutas
            });

            if (foundItem) {
                this.selectItem(foundItem);
                const index = items.indexOf(foundItem);
                const page = Math.floor(index / this.itemsPerPage()) + 1;
                this.currentPage.set(page);
            }
        }
    }

    selectType(type: ItemType): void {
        if (this.selectedType() === type) return;

        this.selectedType.set(type);
        this.currentPage.set(1);
        this.selectedItem = null;
        this.fetchDataWithLoading();
    }

    private async fetchDataWithLoading(): Promise<void> {
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
            await this.loadItems();
        } catch (e) {
            console.error(e);
        } finally {
            this.clearLoadingState();
        }
    }

    // --- SELECCIÓN Y DIÁLOGOS ---

    selectItem(item: any): void {
        this.selectedItem = item;

        // Si es móvil, abrimos diálogo. Si es Desktop, se muestra incrustado
        if (!this.isDesktop()) {
            this.openDialogForItem(item);
        }
    }

    private openDialogForItem(item: any): void {
        if (this.dialog.openDialogs.length > 0) return;

        const dialogConfig = {
            panelClass: 'saved-item-dialog-panel',
            autoFocus: false,
            width: '400px',
            maxWidth: '90vw',
            data: {
                item: item,
                displayName: this.getDisplayName(item)
            }
        };

        let dialogRef;

        // Aquí usamos el switch type, es más limpio que instanceof para decidir el componente
        switch (this.selectedType()) {
            case 'lugares':
                dialogRef = this.dialog.open(SavedPoiDialog, dialogConfig);
                break;
            case 'vehiculos':
                dialogRef = this.dialog.open(SavedVehicleDialog, dialogConfig);
                break;
            // case 'rutas': ...
        }

        // Suscribirse siempre al resultado, sea cual sea el tipo
        if (dialogRef) {
            dialogRef.afterClosed().subscribe((result) => this.processDialogResult(result));
        }
    }

    private processDialogResult(result: any) {
        if (result && !result.ignore) {
            this.handleDialogActions(result);
            this.deselectItem();
        } else if (!result?.ignore) {
            this.deselectItem(); // Cerrado sin acción (clic fuera o X)
        }
    }

    handleDialogActions(action: string | undefined): void {
        switch (action) {
            case 'delete':
                this.deselectItem();
                this.loadItems(); // Recargar lista
                break;
            case 'update':
                this.loadItems(); // Recargar lista para reflejar cambios (ej. alias)
                break;
            case 'showOnMap':
                if (this.selectedItem && this.selectedType() === 'lugares') {
                    const poi = this.selectedItem as POIModel;
                    this.router.navigate(['/map'], {
                        queryParams: { lat: poi.lat, lon: poi.lon, name: poi.alias }
                    });
                }
                break;
            case 'route-from': // Origen fijado (Lugar)
                this.initRouteFlow({ fixedOrigin: this.selectedItem });
                break;
            case 'route-to': // Destino fijado (Lugar)
                this.initRouteFlow({ fixedDest: this.selectedItem });
                break;
            case 'route-vehicle': // Vehículo fijado
                this.initRouteFlow({ fixedVehicle: this.selectedItem });
                break;
        }
    }

    deselectItem(): void {
        this.selectedItem = null;
    }

    getDisplayName(item: any): string {
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
            this.loadItems();
        }
    }

    private showSnackbar(msg: string): void {
        this.snackBar.open(msg, 'Ok', { duration: 5000, horizontalPosition: 'left', verticalPosition: 'bottom' });
    }

    // LÓGICA DE RUTA ---------------------

    /**
     * Inicia el flujo de cálculo de ruta saltando pasos si hay datos fijos.
     */
    async initRouteFlow(prefilled: { fixedOrigin?: any, fixedDest?: any, fixedVehicle?: any }) {
        let step = 1;
        const totalSteps = 4;

        let originData = prefilled.fixedOrigin ? {
            name: this.getDisplayName(prefilled.fixedOrigin),
            hash: prefilled.fixedOrigin.geohash,
            lat: prefilled.fixedOrigin.lat,
            lon: prefilled.fixedOrigin.lon,
        } : null;

        let destData = prefilled.fixedDest ? {
            name: this.getDisplayName(prefilled.fixedDest),
            hash: prefilled.fixedDest.geohash,
            lat: prefilled.fixedDest.lat,
            lon: prefilled.fixedDest.lon,
        } : null;

        let transporte: TIPO_TRANSPORTE | null = prefilled.fixedVehicle ? TIPO_TRANSPORTE.VEHICULO : null;
        let selectedVehicleMatricula: string | undefined = prefilled.fixedVehicle?.matricula;
        let preferencia: PREFERENCIA | null = null;

        while (step <= totalSteps && step > 0) {
            switch (step) {
                case 1: // Origen
                    if (prefilled.fixedOrigin) { step++; break; } // Saltar si ya tenemos origen
                    const resO = await this.getPointFromUser('Punto de Origen', '¿Desde dónde quieres salir?', 1, 4, true); // showBack true para cancelar
                    if (!resO || resO === 'BACK') return;
                    originData = resO;
                    if (destData && destData.hash === originData?.hash) {
                        this.showSnackbar('El origen y el destino son el mismo lugar.');
                        break;
                    }
                    step++;
                    break;

                case 2: // Destino
                    if (prefilled.fixedDest) { step++; break; } // Saltar si ya tenemos destino
                    const resD = await this.getPointFromUser('Punto de Destino', '¿A dónde quieres ir?', 2, 4, true);
                    if (resD === 'BACK') {
                        // Si retrocedemos y el origen estaba fijado, cancelamos
                        if(prefilled.fixedOrigin) return;
                        step--;
                        break;
                    }
                    if (!resD) return;
                    destData = resD;
                    if (originData && originData.hash === destData?.hash) {
                        this.showSnackbar('El origen y el destino son el mismo lugar.');
                        break;
                    }
                    step++;
                    break;

                case 3: // Transporte
                    if (prefilled.fixedVehicle) { step++; break; } // Saltar si ya tenemos vehículo

                    const resT = await this.getRouteOption<TIPO_TRANSPORTE | 'BACK'>('transport', step, totalSteps);
                    if (resT === 'BACK') {
                        if(prefilled.fixedDest) {
                            // Si el destino estaba fijado, al dar atrás en paso 3 vamos al 1 (origen)
                            step = 1;
                            originData = null; // Limpiamos origen manual para volver a pedirlo
                        } else {
                            step--;
                        }
                        break;
                    }
                    if (!resT) return;
                    transporte = resT as TIPO_TRANSPORTE;

                    if (transporte === TIPO_TRANSPORTE.VEHICULO) {
                        const savedVehicle = await this.selectSavedItem('vehiculos', 'Selecciona tu vehículo', true);
                        if (savedVehicle === 'BACK') break; // Reintentar transporte
                        if (!savedVehicle) return;
                        selectedVehicleMatricula = savedVehicle.matricula;
                    } else {
                        selectedVehicleMatricula = undefined;
                    }
                    step++;
                    break;

                case 4: // Preferencia
                    const resP = await this.getRouteOption<PREFERENCIA | 'BACK'>('preference', step, totalSteps);
                    if (resP === 'BACK') {
                        // Si teníamos vehículo fijo, al dar atrás en pref, volvemos a destino (paso 2)
                        // porque el paso 3 (transporte) se salta automáticamente.
                        if (prefilled.fixedVehicle) {
                            step = 2;
                            destData = null; // Limpiamos destino manual
                            // Si ADEMÁS el destino fuera fijo...
                            if (prefilled.fixedDest) {
                                step = 1; // Vamos al origen
                            }
                        } else {
                            step--;
                        }
                        break;
                    }
                    if (!resP) return;
                    preferencia = resP as PREFERENCIA;
                    step++;
                    break;
            }
        }

        // Navegar al mapa
        if (step > totalSteps) {
            const startHash = originData!.hash || geohashForLocation([originData!.lat, originData!.lon], 7);
            const endHash = destData!.hash || geohashForLocation([destData!.lat, destData!.lon], 7);

            const routeParams = {
                mode: 'route',
                start: startHash,
                startName: originData!.name,
                end: endHash,
                endName: destData!.name,
                transport: transporte,
                preference: preferencia,
                matricula: selectedVehicleMatricula
            };
            const cleanParams = JSON.parse(JSON.stringify(routeParams));
            this.router.navigate(['/map'], { queryParams: cleanParams });
        }
    }

    // ==========================================================
    // HELPERS
    // ==========================================================

    private async getPointFromUser(title: string, subtitle: string, currentStep: number, totalSteps: number, showBack: boolean): Promise<any | 'BACK' | null> {
        while (true) {
            const dialogRef = this.dialog.open(RouteOriginDialog, {
                width: '90%', maxWidth: '400px',
                data: {title, subtitle, currentStep, totalSteps, showBack}
            });
            const originMethod = await firstValueFrom(dialogRef.afterClosed()) as RouteOriginMethod;

            if (originMethod === 'BACK') return 'BACK';
            if (!originMethod) return null;

            if (originMethod === 'saved') {
                const savedPoi = await this.selectSavedItem('lugares', 'Mis lugares guardados', true);
                if (savedPoi === 'BACK') continue; // Volver al diálogo
                if (!savedPoi) return null; // Cerrar
                return {
                    hash: savedPoi.geohash,
                    name: savedPoi.alias || savedPoi.placeName,
                    lat: savedPoi.lat, lon: savedPoi.lon
                };
            }

            const searchMethod = await this.askForSearchMethod();
            if (!searchMethod) continue;

            const search = await this.executeSearchMethod(searchMethod, true);
            if (search === 'BACK') continue;
            if (search) return search;
        }
    }

    private async askForSearchMethod(): Promise<AddPoiMethod> {
        const dialogRef = this.dialog.open(AddPoiDialogComponent, { width: '90%', maxWidth: '400px' });
        return await firstValueFrom(dialogRef.afterClosed());
    }

    private async executeSearchMethod(method: AddPoiMethod, confirm: boolean): Promise<any | 'BACK' | null> {
        let potentialPOI: POISearchModel | null = null;
        try {
            if (method === 'coords') {
                const dialogRef = this.dialog.open(CoordsSearchDialogComponent, {width: '90%', maxWidth: '400px'});
                const coords = await firstValueFrom(dialogRef.afterClosed());
                if (!coords) return 'BACK';

                const snackBarRef =  this.snackBar.open('Obteniendo dirección...', '', {duration: 0});
                try { potentialPOI = await this.mapSearchService.searchPOIByCoords(coords.lat, coords.lon); }
                finally { snackBarRef.dismiss(); }

                if (!potentialPOI) {
                    this.snackBar.open("No se pudo obtener la dirección.", 'OK', {duration: 3000});
                    return 'BACK';
                }
            } else if (method === 'name') {
                const dialogRef = this.dialog.open(PlaceNameSearchDialogComponent, {width: '90%', maxWidth: '400px'});
                const nameStr = await firstValueFrom(dialogRef.afterClosed());
                if (!nameStr) return 'BACK';

                this.snackBar.open('Buscando lugar...', '', {duration: 1500});
                const results = await this.mapSearchService.searchPOIByPlaceName(nameStr);

                if (results && results.length > 0) {
                    if (!confirm) return {name: nameStr};
                    const selectedResult = await this.selectSavedItem('search-results', 'Resultados', true, results);
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
            this.snackBar.open(`Tu búsqueda no dió resultados.`, '', { duration: 3000 });
            return 'BACK';
        }

        if (potentialPOI && confirm) {
            const confirmRef = this.dialog.open(PointConfirmationDialog, {
                width: '90%', maxWidth: '400px', data: potentialPOI
            });
            const confirmed = await firstValueFrom(confirmRef.afterClosed());
            return confirmed ? { lat: potentialPOI.lat, lon: potentialPOI.lon, name: potentialPOI.placeName } : 'BACK';
        }
        return null;
    }

    private async getRouteOption<T>(type: 'transport' | 'preference', currentStep: number, totalSteps: number): Promise<T | null> {
        const dialogRef = this.dialog.open(RouteOptionsDialogComponent, {
            width: '90%', maxWidth: '400px', disableClose: false,
            data: {type, currentStep, totalSteps, showBack: true}
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }

    private async selectSavedItem(type: 'lugares' | 'vehiculos' | 'search-results', title?: string, showBack: boolean = false, items?: any[]): Promise<any | 'BACK' | null> {
        const dialogRef = this.dialog.open(SavedItemSelector, {
            width: '90%', maxWidth: '450px', height: 'auto', maxHeight: '80vh',
            data: {type, title, showBack, items}
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }
}
