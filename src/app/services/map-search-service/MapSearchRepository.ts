import {InjectionToken} from '@angular/core';
import {POISearchModel} from '../../data/POISearchModel';
import {Geohash} from 'geofire-common';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {RouteResultModel} from '../../data/RouteResultModel';

export const MAP_SEARCH_REPOSITORY = new InjectionToken<MapSearchRepository>('MapSearchRepository');

export interface MapSearchRepository {
    // Buscar POI
    searchPOIByCoords(lat: number, lon: number): Promise<POISearchModel>;
    searchPOIByPlaceName(placeName: string): Promise<POISearchModel[]>;

    // Buscar una ruta entre dos POI
    searchRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA): Promise<RouteResultModel>;
}
