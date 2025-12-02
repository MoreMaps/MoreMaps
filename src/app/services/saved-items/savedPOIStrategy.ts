import {inject, Injectable} from '@angular/core';
import {SavedItemsStrategy} from './savedItemsStrategy';
import {POIService} from '../POI/poi.service';
import {Auth} from '@angular/fire/auth';
import {POIModel} from '../../data/POIModel';

@Injectable({providedIn: 'root'})
export class SavedPOIStrategy implements SavedItemsStrategy {
    private poiService = inject(POIService);

    async loadItems(auth: Auth): Promise<POIModel[]>{
        return await this.poiService.getPOIList(auth);
    }

    async toggleFavorite(auth:Auth, item: POIModel): Promise<boolean> {
        return await this.poiService.pinPOI(auth, item);
    }

    getEmptyMessage(): string {
        return 'No tienes lugares guardados. Explora el mapa y guarda tus lugares favoritos.';
    }

    getDisplayName(item: POIModel): string {
        return (item.alias && item.alias.trim() !== '') ? item.alias : item.placeName;
    }
}
