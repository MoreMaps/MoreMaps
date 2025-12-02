import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {GeoJSON} from 'leaflet';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {MapSearchRepository} from './MapSearchRepository';
import {POISearchModel} from "../../data/POISearchModel";
import {LatitudeRangeError} from '../../errors/LatitudeRangeError';
import {LongitudeRangeError} from '../../errors/LongitudeRangeError';
import {CoordsNotFoundError} from '../../errors/CoordsNotFoundError';
import {environment} from '../../../environments/environment';
import {PlaceNameNotFoundError} from '../../errors/PlaceNameNotFoundError';
import {APIAccessError} from '../../errors/APIAccessError';

@Injectable({
    providedIn: 'root'
})
export class MapSearchAPI implements MapSearchRepository {
    private readonly apiKey = environment.openrouteservice.apiKey;
    private readonly baseUrl = 'https://api.openrouteservice.org';
    private readonly headers: HttpHeaders = new HttpHeaders({
        'Accept': 'application/json',
    });

    constructor(private http: HttpClient) {
    }

    async searchPOIByCoords(lat: number, lon: number): Promise<POISearchModel> {
        // Validar rangos
        if (lat < -90 || lat > 90) {
            throw new LatitudeRangeError();
        }
        if (lon < -180 || lon > 180) {
            throw new LongitudeRangeError();
        }

        // Número de features que va a devolver la llamada a la API de Geocode.
        const size = 1;

        // Parámetros para la llamada a la API de Geocode.
        const params: HttpParams = new HttpParams({
            fromObject: {
                api_key: this.apiKey,
                'point.lat': lat.toString(),
                'point.lon': lon.toString(),
                'boundary.circle.radius': 1,
                size: size.toString(),
            }
        });

        // Respuesta de la llamada a la API de Geocode, en formato GeoJSON.
        let respuesta: GeoJSON;

        // Llamada a la API.
        try {
            respuesta = await this.getDataFromAPI<GeoJSON>(
                `${this.baseUrl}/geocode/reverse`,
                this.headers,
                params,
            );
        } catch (error) {
            console.error('Error al obtener respuesta de la API: ' + error);
            throw new APIAccessError();
        }

        // Lista de POI recibidos (de tamaño "size")
        const listaPOI: POISearchModel[] = this.obtainDataFromGeoJsonFeatures(respuesta, size);

        if (listaPOI.length === 0) {
            throw new CoordsNotFoundError(lat, lon);
        }

        return listaPOI[0];
    }

    async searchPOIByPlaceName(placeName: string): Promise<POISearchModel[]> {
        console.log("Buscando topónimo: " + placeName);

        // Número de features que va a devolver la llamada a la API de Geocode.
        const size = 10;

        // Parámetros para la llamada a la API de Geocode.
        const params: HttpParams = new HttpParams({
            fromObject: {
                api_key: this.apiKey,
                text: placeName,
                size: size.toString(),
            }
        });

        // Respuesta de la llamada a la API de Geocode, en formato GeoJSON.
        let respuesta: GeoJSON;

        // Llamada a la API.
        try {
            respuesta = await this.getDataFromAPI<GeoJSON>(
                `${this.baseUrl}/geocode/search`,
                this.headers,
                params,
            );
        } catch (error) {
            console.error(`La respuesta al API ha fallado, ${error}`);
            throw new APIAccessError();
        }

        // Lista de POI recibidos (de tamaño "size")
        const listaPOI: POISearchModel[] = this.obtainDataFromGeoJsonFeatures(respuesta, size);
        if (listaPOI.length === 0) {
            throw new PlaceNameNotFoundError(placeName);
        }

        return listaPOI;
    }

    /**
     * Función genérica para hacer peticiones a la API
     * @param url URL base para la petición
     * @param headers Headers de la petición
     * @param params Parámetros de la petición
     * @returns Respuesta de la API
     */
    private async getDataFromAPI<T>(url: string, headers: HttpHeaders, params: HttpParams): Promise<T> {
        return firstValueFrom(this.http.get<T>(url, {headers, params}));
    }

    /**
     * Función para extraer un array de coordenadas y nombres de un GeoJSON
     * @param geoJsonObject Objeto en formato GeoJSON
     * @param num Número de features a leer
     * @private
     * @returns Array de POISearchModel (latitud, longitud, topónimo)
     */
    private obtainDataFromGeoJsonFeatures(geoJsonObject: any, num: number): POISearchModel[] {
        // Validar que existan features
        const features = geoJsonObject?.features;
        if (!features?.length || features.length === 0) {
            return [];
        }

        // Procesar solo los primeros 'num' features disponibles
        const featuresToProcess = features.slice(0, num);
        const result: POISearchModel[] = [];

        for (const feature of featuresToProcess) {
            const name = feature.properties?.name;
            const locality = feature.properties?.locality;
            const coords = feature.geometry?.coordinates; // (coords[1] = lat, coords[0] = lon)

            // Construir nombre completo (nombre + localidad, si localidad existe. name siempre deberá existir)
            if (name === undefined) continue;
            const placeName = locality ? `${name}, ${locality}` : name;

            // Validar datos del feature actual
            if (!placeName || placeName.trim() === '' || !coords || coords.length < 2) {
                continue; // Salta este feature
            }

            // Añadir al resultado
            result.push(new POISearchModel(coords[1], coords[0], placeName));
        }

        return result;
    }

}
