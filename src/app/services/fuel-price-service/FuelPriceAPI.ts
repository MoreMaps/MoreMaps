import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {FuelPriceRepository, MapaCombustible} from './FuelPriceRepository';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {APIAccessError} from '../../errors/APIAccessError';

// Interfaz para mapear los datos de la respuesta de la API
export interface FuelResponse {
    Fecha: string;
    ListaEESSPrecio: FuelStation[];
    Nota: string;
    ResultadoConsulta: string;
}

// Interfaz con los datos de los combustibles de cada estación
export interface FuelStation {
    "Precio Biodiesel": string;
    "Precio Bioetanol": string;
    "Precio Gas Natural Comprimido": string; // para "GNC"
    "Precio Gas Natural Licuado": string;
    "Precio Gases licuados del petróleo": string; // para "GLP"
    "Precio Gasoleo A": string; // Para "Diesel"
    "Precio Gasoleo B": string;
    "Precio Gasolina 95 E10": string;
    "Precio Gasolina 95 E5": string; // para "Gasolina"
    "Precio Gasolina 98 E10": string;
    "Precio Gasolina 98 E5": string;
    "Precio Hidrogeno": string; // para "Hidrógeno"
}

const FUEL_PROPERTY_MAP: Partial<Record<FUEL_TYPE, keyof FuelStation>> = {
    [FUEL_TYPE.GASOLINA]: 'Precio Gasolina 95 E5',
    [FUEL_TYPE.DIESEL]: 'Precio Gasoleo A',
    [FUEL_TYPE.GLP]: 'Precio Gases licuados del petróleo',
    [FUEL_TYPE.GNC]: 'Precio Gas Natural Comprimido',
    [FUEL_TYPE.HIDROGENO]: 'Precio Hidrogeno',
};


@Injectable({
    providedIn: 'root'
})
export class FuelPriceAPI implements FuelPriceRepository {
    private readonly apiUrl: string =
        'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres';

    private readonly headers: HttpHeaders = new HttpHeaders({
        'Accept': 'application/json',
    });

    constructor(private http: HttpClient) { }

    /**
     * Obtiene el precio del combustible en €/L ó €/Kg, si existe en la BD.
     * @throws {APIAccessError} Si hay un error accediendo a la API.
     */
    async getPrice(type: FUEL_TYPE, mapa: MapaCombustible): Promise<number> {
        return mapa.get(type) || -1;
    }

    /**
     * Devuelve un mapa con el precio de cada tipo de combustible (vacío si no se encontraron estaciones).
     * @throws {APIAccessError} Si hay un error accediendo a la API.
     */
    async processStations(): Promise<MapaCombustible> {
        const tiposCombustible = Object.keys(FUEL_PROPERTY_MAP) as FUEL_TYPE[];
        const estaciones: FuelStation[] = await this.getAllStations();

        let mapaPrecios: MapaCombustible = new Map<FUEL_TYPE, number>();

        if (!estaciones || estaciones.length === 0) {
            return mapaPrecios;
        }

        // Mapa auxiliar para contar cuántas estaciones tiene cada combustible
        let contadores: Map<FUEL_TYPE, number> = new Map<FUEL_TYPE, number>();

        // Inicializar mapas
        tiposCombustible.forEach(tipo => {
            mapaPrecios.set(tipo, 0);
            contadores.set(tipo, 0);
        });

        // Recorrer estaciones
        estaciones.forEach(estacion => {
            tiposCombustible.forEach(tipoCombustible => {
                const keyJson = FUEL_PROPERTY_MAP[tipoCombustible];
                if (!keyJson) return;

                const precioString = estacion[keyJson];
                const precio = parseFloat(precioString.replace(',', '.'));

                // Solo sumar si hay un precio válido (> 0 y no null)
                if (precio != null && precio > 0) {
                    const precioAcumulado = mapaPrecios.get(tipoCombustible) || 0;
                    const contadorActual = contadores.get(tipoCombustible) || 0;

                    mapaPrecios.set(tipoCombustible, precioAcumulado + precio);
                    contadores.set(tipoCombustible, contadorActual + 1);
                }
            });
        });

        // Calcular medias reales
        tiposCombustible.forEach(tipo => {
            const total = mapaPrecios.get(tipo) || 0;
            const contador = contadores.get(tipo) || 0;

            // Evitar división por cero si ningún sitio vende ese combustible
            if (contador > 0) {
                mapaPrecios.set(tipo, total / contador);
            }
        });

        return mapaPrecios;
    }

    /**
     * Realiza una petición a una API y devuelve el primer valor recibido
     * @param url URL base para la petición
     * @param headers Headers de la petición
     * @param params Parámetros de la petición
     * @returns Respuesta de la API
     * @throws {APIAccessError} Si hay un error accediendo a la API.
     */
    private async getDataFromAPI<T>(url: string, headers?: HttpHeaders, params?: HttpParams): Promise<T> {
        let respuesta: T;
        try {
            respuesta = await firstValueFrom(this.http.get<T>(url, {headers, params}));
        } catch (error) {
            console.error('Error al obtener respuesta de la API: ' + error);
            throw new APIAccessError();
        }

        return respuesta;
    }

    /**
     * Obtiene y procesa datos en formato JSON
     * @private
     * @throws {APIAccessError} Si hay un error accediendo a la API.
     */
    private async getAllStations(): Promise<FuelStation[]>{
        let respuesta: FuelResponse;
        respuesta = await this.getDataFromAPI<FuelResponse>(this.apiUrl, this.headers)

        // Lista de estaciones obtenida de la API
        return respuesta?.ListaEESSPrecio;
    }
}
