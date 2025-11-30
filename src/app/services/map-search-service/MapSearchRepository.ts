import {InjectionToken} from '@angular/core';
import {POISearchModel} from '../../data/POISearchModel';

export const MAP_SEARCH_REPOSITORY = new InjectionToken<MapSearchRepository>('MapSearchRepository');

export interface MapSearchRepository {
    // search by placename and coordinates
    searchPOIByCoords(lat: number, lon: number): Promise<POISearchModel>;
    searchPOIByPlaceName(placeName: string): Promise<POISearchModel[]>;

    // to do in future iterations: search route between two POI
}
