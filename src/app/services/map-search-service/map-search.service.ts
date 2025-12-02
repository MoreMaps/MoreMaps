import {inject, Injectable} from '@angular/core';
import {MAP_SEARCH_REPOSITORY, MapSearchRepository} from './MapSearchRepository';
import {POISearchModel} from '../../data/POISearchModel';

@Injectable({ providedIn: 'root' })
export class MapSearchService {
    private mapSearchApi: MapSearchRepository = inject(MAP_SEARCH_REPOSITORY);

    async searchPOIByCoords(lat: number, lon: number): Promise<POISearchModel> {
        return this.mapSearchApi.searchPOIByCoords(lat, lon);
    }

    async searchPOIByPlaceName(placeName: string): Promise<POISearchModel[]> {
        return this.mapSearchApi.searchPOIByPlaceName(placeName);
    }
}
