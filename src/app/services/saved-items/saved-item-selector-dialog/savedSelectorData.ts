import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

// Modelos y Servicios
import {POISearchModel} from '../../../data/POISearchModel';
import {POIService} from '../../POI/poi.service';
import {POI_REPOSITORY} from '../../POI/POIRepository';
import {POIDB} from '../../POI/POIDB';
import {VEHICLE_REPOSITORY} from '../../Vehicle/VehicleRepository';
import {VehicleDB} from '../../Vehicle/VehicleDB';
import {VehicleService} from '../../Vehicle/vehicle.service';
import {SavedPOIStrategy} from '../savedPOIStrategy';
import {SavedVehicleStrategy} from '../saved-vehicle-strategy.service';
import {SavedItemsStrategy} from '../savedItemsStrategy';

export interface SavedSelectorData {
    type: 'lugares' | 'vehiculos' | 'search-results';
    title?: string;
    showBack: boolean;
    items?: any[];
}

@Component({
    selector: 'app-saved-item-selector-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        NgOptimizedImage
    ],
    templateUrl: './savedSelectorData.html',
    styleUrls: ['./savedSelectorData.scss'],
    providers: [
        POIService,
        VehicleService,
        {provide: POI_REPOSITORY, useClass: POIDB},
        {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
        SavedPOIStrategy,
        SavedVehicleStrategy
    ]
})
export class SavedItemSelector implements OnInit {
    private dialogRef = inject(MatDialogRef<SavedItemSelector>);
    public data = inject<SavedSelectorData>(MAT_DIALOG_DATA);

    private strategies: Record<string, SavedItemsStrategy> = {
        'lugares': inject(SavedPOIStrategy),
        'vehiculos': inject(SavedVehicleStrategy)
    };

    // Estado de datos
    items = signal<any[]>([]);
    isLoading = signal<boolean>(true);
    currentStrategy!: SavedItemsStrategy;

    // --- Paginación ---
    readonly itemsPerPage = signal(5); // 5 elementos por página en el diálogo
    currentPage = signal(1);

    totalPages = computed(() => {
        const count = this.items().length;
        if (count === 0) return 1;
        return Math.ceil(count / this.itemsPerPage());
    });

    paginatedItems = computed(() => {
        const start = (this.currentPage() - 1) * this.itemsPerPage();
        const end = start + this.itemsPerPage();
        return this.items().slice(start, end);
    });

    ngOnInit(): void {
        if (this.data.items && this.data.items.length > 0) {
            this.items.set(this.data.items);
            this.isLoading.set(false);
        } else {
            if (this.strategies[this.data.type]) {
                this.currentStrategy = this.strategies[this.data.type];
                void this.loadItems();
            }
        }
    }

    async loadItems(): Promise<void> {
        this.isLoading.set(true);
        try {
            const loadedItems = await this.currentStrategy.loadItems();
            this.items.set(loadedItems);
            this.currentPage.set(1); // Resetear a página 1 al cargar
        } catch (error) {
            console.error('Error cargando items:', error);
            this.items.set([]);
        } finally {
            this.isLoading.set(false);
        }
    }

    // --- Controles de Paginación ---
    previousPage(): void {
        if (this.currentPage() > 1) {
            this.currentPage.set(this.currentPage() - 1);
        }
    }

    nextPage(): void {
        if (this.currentPage() < this.totalPages()) {
            this.currentPage.set(this.currentPage() + 1);
        }
    }

    // --- Acciones ---

    selectItem(item: any): void {
        this.dialogRef.close(item);
    }

    getDisplayName(item: any): string {
        if (this.data.type === 'search-results') {
            return (item as POISearchModel).placeName;
        }
        return this.currentStrategy.getDisplayName(item);
    }

    close(): void {
        this.dialogRef.close(null);
    }

    goBack(): void {
        this.dialogRef.close('BACK');
    }
}
