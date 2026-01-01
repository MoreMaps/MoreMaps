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
import {WrongParamsError} from '../../errors/WrongParamsError';
import {GeohashDecoder} from '../../utils/geohashDecoder';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';
import {InvalidDataError} from '../../errors/InvalidDataError';

export type coords = [number, number];

@Injectable({ providedIn: 'root' })
export class MapSearchService {
    private mapSearchApi: MapSearchRepository = inject(MAP_SEARCH_REPOSITORY);

    // HU201: Buscar POI por coordenadas
    /**
     * Busca un POI por coordenadas.
     * @param lat Latitud del POI.
     * @param lon Longitud del POI.
     * @returns El primer POI encontrado.
     * @throws LatitudeRangeError Si la latitud es inválida.
     * @throws LongitudeRangeError Si la longitud es inválida.
     * @throws CoordsNotFoundError Si no se encuentra ningún POI cercano.
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
     * @throws PlaceNameNotFoundError Si no se encuentra el topónimo.
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
     * Busca una ruta entre 2 POI.
     * @param origen Origen de la ruta
     * @param destino Destino de la ruta
     * @param transporte Transporte escogido
     * @param preferencia Preferencia escogida
     * @throws WrongParamsError Si algún parámetro no es correcto
     * @throws ImpossibleRouteError Si la ruta es imposible
     * @throws InvalidDataError Si los datos recibidos son inválidos
     */
    async searchRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA): Promise<RouteResultModel> {
        // Comprobar que los parámetros están bien
        if (!origen || !destino || !transporte || !preferencia) {
            throw new WrongParamsError('ruta');
        }

        // Obtener [lon, lan] de origen y destino que espera ORS.
        const coordsOrigen: coords = GeohashDecoder.decodeGeohash(origen);
        const coordsDestino: coords = GeohashDecoder.decodeGeohash(destino);

        // Realizar la petición.
        // Si la ruta devuelta es nula, se considera imposible.
        const ruta = await this.mapSearchApi.searchRoute(coordsOrigen, coordsDestino, transporte, preferencia);
        if (!ruta) {
            throw new ImpossibleRouteError();
        }
        // Si la distancia o el tiempo son cero o negativos, la ruta no es válida porque no tiene coste alguno.
        if (ruta.distancia <= 0 || ruta.tiempo <= 0) {
            throw new InvalidDataError();
        }
        return ruta;
    }
}
