import {InjectionToken} from '@angular/core';
import {POISearchModel} from '../../../data/POISearchModel';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../../data/RouteModel';
import {RouteResultModel} from '../../../data/RouteResultModel';
import {coords} from './map-search.service';

export const MAP_SEARCH_REPOSITORY = new InjectionToken<MapSearchRepository>('MapSearchRepository');

export interface MapSearchRepository {
    // Buscar POI
    searchPOIByCoords(lat: number, lon: number, size: number): Promise<POISearchModel[]>;
    searchPOIByPlaceName(placeName: string, size: number): Promise<POISearchModel[]>;

    // Buscar una ruta entre dos POI
    searchRoute(origen: coords, destino: coords, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA): Promise<RouteResultModel | null>;
}
