import {Injectable} from '@angular/core';
import {MapSearchRepository} from './MapSearchRepository';
import { POISearchModel } from "../../data/POISearchModel";

@Injectable({
    providedIn: 'root'
})
export class MapSearchAPI implements MapSearchRepository {
    async searchPOIByCoords(lat: number, lon: number): Promise<POISearchModel> {
        return new POISearchModel(0, 0, "");
    }

    async searchPOIByPlaceName(placeName: string): Promise<POISearchModel> {
        return new POISearchModel(0, 0, "");
    }

}
