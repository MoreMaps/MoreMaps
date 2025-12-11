import {inject, Injectable} from '@angular/core';
import {MAP_SEARCH_REPOSITORY, MapSearchRepository} from './MapSearchRepository';
import {POISearchModel} from '../../data/POISearchModel';
import {Geohash} from 'geofire-common';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {RouteResultModel} from '../../data/RouteResultModel';

@Injectable({ providedIn: 'root' })
export class MapSearchService {
    private mapSearchApi: MapSearchRepository = inject(MAP_SEARCH_REPOSITORY);

    // HU201: Buscar POI por coordenadas
    async searchPOIByCoords(lat: number, lon: number): Promise<POISearchModel> {
        return this.mapSearchApi.searchPOIByCoords(lat, lon);
    }

    // HU202: Buscar POI por topónimo
    async searchPOIByPlaceName(placeName: string): Promise<POISearchModel[]> {
        return this.mapSearchApi.searchPOIByPlaceName(placeName);
    }

    // HU401, HU404-406: Buscar una ruta según preferencia entre dos POI
    async searchRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA): Promise<RouteResultModel> {
        return new RouteResultModel(0.0, 0.0, '');
    }
}
