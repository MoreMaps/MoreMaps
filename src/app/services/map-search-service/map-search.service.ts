import {inject, Injectable} from '@angular/core';
import {MAP_SEARCH_REPOSITORY, MapSearchRepository} from './MapSearchRepository';
import {POISearchModel} from '../../data/POISearchModel';
import {Geohash} from 'geofire-common';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {RouteResultModel} from '../../data/RouteResultModel';
import {LatitudeRangeError} from '../../errors/POI/LatitudeRangeError';
import {LongitudeRangeError} from '../../errors/POI/LongitudeRangeError';
import {CoordsNotFoundError} from '../../errors/POI/CoordsNotFoundError';
import {PlaceNameNotFoundError} from '../../errors/POI/PlaceNameNotFoundError';


@Injectable({ providedIn: 'root' })
export class MapSearchService {
    private mapSearchApi: MapSearchRepository = inject(MAP_SEARCH_REPOSITORY);

    // HU201: Buscar POI por coordenadas
    /**
     * Busca un POI por coordenadas.
     * @param lat Latitud del POI.
     * @param lon Longitud del POI.
     * @returns El primer POI encontrado.
     */
    async searchPOIByCoords(lat: number, lon: number): Promise<POISearchModel> {
        // Validar rangos
        if (lat < -90 || lat > 90) {
            throw new LatitudeRangeError();
        }
        if (lon < -180 || lon > 180) {
            throw new LongitudeRangeError();
        }

        // Número de features que va a devolver la llamada a la API de Geocode.
        // (nos vale solo el primero)
        const size = 1;

        // Consulta a ORS
        const res = await this.mapSearchApi.searchPOIByCoords(lat, lon, size);
        if (res.length === 0) throw new CoordsNotFoundError(lat, lon);
        return res[0];
    }

    // HU202: Buscar POI por topónimo
    /**
     * Busca un POI por topónimo.
     * @param placeName Topónimo del POI.
     * @returns Los primeros 10 POI encontrados.
     */
    async searchPOIByPlaceName(placeName: string): Promise<POISearchModel[]> {
        // Número de features que va a devolver la llamada a la API de Geocode.
        const size = 10;

        // Consulta a ORS
        const res = await this.mapSearchApi.searchPOIByPlaceName(placeName, size);
        if (res.length === 0) throw new PlaceNameNotFoundError(placeName);
        return res;
    }

    // HU401, HU404-406: Buscar una ruta según preferencia entre dos POI
    /**
     * Busca una ruta entre 2 POI. FALTA POR REFACTORIZAR
     * @param origen
     * @param destino
     * @param transporte
     * @param preferencia
     */
    async searchRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA): Promise<RouteResultModel> {
        return this.mapSearchApi.searchRoute(origen, destino, transporte, preferencia);
    }
}
