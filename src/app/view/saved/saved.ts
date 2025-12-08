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

        // CORRECCIÓN: Suscribirse siempre al resultado, sea cual sea el tipo
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
            case 'route':
                console.log('Iniciar ruta...');
                break;
            case 'showOnMap':
                if (this.selectedItem && this.selectedType() === 'lugares') {
                    const poi = this.selectedItem as POIModel;
                    this.router.navigate(['/map'], {
                        queryParams: { lat: poi.lat, lon: poi.lon, name: poi.alias }
                    });
                }
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
}
