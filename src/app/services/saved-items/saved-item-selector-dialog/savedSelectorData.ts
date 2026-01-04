import {Component, inject, OnInit, signal} from '@angular/core';
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
import {SavedVehiclesStrategy} from '../savedVehiclesStrategy';
import {SavedItemsStrategy} from '../savedItemsStrategy';

export interface SavedSelectorData {
    // search-results se emplea para búsqueda de rutas con más de un resultado
    type: 'lugares' | 'vehiculos' | 'search-results';
    title?: string;
    showBack: boolean;
    items?: any[]; // solo para búsquedas de rutas con más de un resultado
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
    // Proveemos las estrategias aquí igual que en SavedItemsComponent
    providers: [
        POIService,
        VehicleService,
        {provide: POI_REPOSITORY, useClass: POIDB},
        {provide: VEHICLE_REPOSITORY, useClass: VehicleDB},
        SavedPOIStrategy,
        SavedVehiclesStrategy
    ]
})
export class SavedItemSelector implements OnInit {
    private dialogRef = inject(MatDialogRef<SavedItemSelector>);
    public data = inject<SavedSelectorData>(MAT_DIALOG_DATA);

    // Estrategias inyectadas
    private strategies: Record<string, SavedItemsStrategy> = {
        'lugares': inject(SavedPOIStrategy),
        'vehiculos': inject(SavedVehiclesStrategy)
    };

    // Estado
    items = signal<any[]>([]);
    isLoading = signal<boolean>(true);
    currentStrategy!: SavedItemsStrategy;

    ngOnInit(): void {
        // Lógica de carga para búsqueda de rutas con más de un resultado
        if (this.data.items && this.data.items.length > 0) {
            this.items.set(this.data.items);
            this.isLoading.set(false);
        } else {
            // Lógica para cargar de BD
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
        } catch (error) {
            console.error('Error cargando items:', error);
            this.items.set([]);
        } finally {
            this.isLoading.set(false);
        }
    }

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
