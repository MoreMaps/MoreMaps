import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {GeoJSON} from 'leaflet';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {MapSearchRepository} from './MapSearchRepository';
import {POISearchModel} from "../../../data/POISearchModel";
import {environment} from '../../../../environments/environment';
import {APIAccessError} from '../../../errors/APIAccessError';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../../data/RouteModel';
import {RouteResultModel} from '../../../data/RouteResultModel';
import {coords} from './map-search.service';

@Injectable({
    providedIn: 'root',
})
export class MapSearchAPI implements MapSearchRepository {
    private readonly apiKey = environment.openrouteservice.apiKey;
    private readonly baseUrl = 'https://api.openrouteservice.org';
    private readonly headers: HttpHeaders = new HttpHeaders({
        'Accept': 'application/json',
    });

    constructor(private http: HttpClient) {
    }

    // Busca un POI por coordenadas
    async searchPOIByCoords(lat: number, lon: number, size: number): Promise<POISearchModel[]> {
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

        // Llamada a la API.
        let respuesta: GeoJSON;
        try {
            respuesta = await this.getDataFromAPI<GeoJSON>(
                `${this.baseUrl}/geocode/reverse`,
                this.headers,
                params,
            );
        } catch (error: any) {
            // Error inesperado de ORS
            console.log(error);
            console.error('Error al obtener respuesta de la API: ' + error.error);
            throw new APIAccessError();
        }

        // Lista de POI recibidos (de tamaño "size")
        return this.obtainDataFromGeoJsonFeatures(respuesta, size);
    }

    // Busca un POI por topónimo
    async searchPOIByPlaceName(placeName: string, size: number): Promise<POISearchModel[]> {
        // Parámetros para la llamada a la API de Geocode.
        const params: HttpParams = new HttpParams({
            fromObject: {
                api_key: this.apiKey,
                text: placeName,
                size: size.toString(),
                layers: 'locality',
            }
        });

        // Llamada a la API.
        let respuesta: GeoJSON;
        try {
            respuesta = await this.getDataFromAPI<GeoJSON>(
                `${this.baseUrl}/geocode/search`,
                this.headers,
                params,
            );
        } catch (error: any) {
            // Error inesperado de ORS
            console.error('Error al obtener respuesta de la API: ' + error.error);
            throw new APIAccessError();
        }

        // Lista de POI recibidos (de tamaño "size")
        return this.obtainDataFromGeoJsonFeatures(respuesta, size);
    }

    /**
     * Devuelve una ruta entre el origen y destino especificados
     * según el tipo de transporte y la preferencia (si es posible)
     * @param origen origen de la ruta
     * @param destino destino de la ruta
     * @param transporte transporte escogido
     * @param preferencia preferencia escogida
     * @throws APIAccessError si la petición a la API falla
     */

    async searchRoute(origen: coords, destino: coords, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA): Promise<RouteResultModel | null> {
        // Preparar el cuerpo de la petición.
        const body = {
          coordinates: [origen, destino],
          preference: preferencia,
        };

        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': this.apiKey // para POST, el API key va en el header
            })
        }

        // Hacer la petición a ORS.
        try {
            // Geojson es el endpoint que devuelve la geometría completa
            const url = `${this.baseUrl}/v2/directions/${transporte}/geojson`;
            const response : any = await firstValueFrom(
                this.http.post(url, body, httpOptions)
            );

            // Extraer datos de la petición.
            const feature = response.features[0];
            const distance = feature.properties.summary.distance; // metros
            const time = feature.properties.summary.duration; // segundos
            const geometry = feature.geometry; // GeoJSON

            return new RouteResultModel(time, distance, geometry);
        }
        catch (error: any) {
            // Si la ruta es imposible, devolver un resultado inválido.
            if (error.status === 400) {
                console.warn('Ruta imposible detectada por el API');
                return null;
            }

            // Ha ocurrido un error inesperado en ORS.
            console.error('Error calculando ruta: ', error);
            throw new APIAccessError();
        }
    }

    /**
     * Realiza una petición a una API y devuelve el primer valor recibido
     * @param url URL base para la petición
     * @param headers Headers de la petición
     * @param params Parámetros de la petición
     * @returns Respuesta de la API
     */
    private async getDataFromAPI<T>(url: string, headers: HttpHeaders, params: HttpParams): Promise<T> {
        return firstValueFrom(this.http.get<T>(url, {headers, params}));
    }

    /**
     * Extrae un array de coordenadas y nombres de un GeoJSON
     * @param geoJsonObject Objeto en formato GeoJSON
     * @param num Número de features a leer
     * @private
     * @returns Array de POISearchModel (latitud, longitud, topónimo)
     */
    private async obtainDataFromGeoJsonFeatures(geoJsonObject: any, num: number): Promise<POISearchModel[]> {
        // Validar que existan features
        const features = geoJsonObject?.features;
        if (!features?.length || features.length === 0) {
            return [];
        }

        // Procesar solo los primeros 'núm' features disponibles
        const featuresToProcess = features.slice(0, num);
        const result: POISearchModel[] = [];

        for (const feature of featuresToProcess) {
            const name = feature.properties?.name;
            const locality = feature.properties?.locality;
            const country = feature.properties?.country;
            const coords = feature.geometry?.coordinates; // (coords[1] = lat, coords[0] = lon)

            // Construir nombre completo (nombre + localidad + país), evitando duplicados
            const placeName = [...new Set([name, locality, country])]
                .filter((str): str is string => !!str) // quita nulls, undefined y cadena vacía
                .join(', ');

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
