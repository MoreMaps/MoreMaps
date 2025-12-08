import {inject, Injectable} from '@angular/core';
import {SavedItemsStrategy} from './savedItemsStrategy';
import {POIService} from '../POI/poi.service';
import {POIModel} from '../../data/POIModel';

@Injectable({providedIn: 'root'})
export class SavedPOIStrategy implements SavedItemsStrategy {
    private poiService = inject(POIService);

    async loadItems(): Promise<POIModel[]>{
        return await this.poiService.getPOIList();
    }

    async toggleFavorite(item: POIModel): Promise<boolean> {
        return await this.poiService.pinPOI(item);
    }

    getEmptyMessage(): string {
        return 'No tienes lugares guardados. Explora el mapa y guarda tus lugares favoritos.';
    }

    getDisplayName(item: POIModel): string {
        return (item.alias && item.alias.trim() !== '') ? item.alias : item.placeName;
    }
}
