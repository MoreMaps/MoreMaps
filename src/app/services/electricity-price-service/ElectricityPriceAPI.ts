import {Injectable} from '@angular/core';
import {ElectricityPriceRepository} from './ElectricityPriceRepository';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {APIAccessError} from '../../errors/APIAccessError';

// Interfaz para mapear los datos necesarios de la respuesta de la API
interface ReeApiResponse {
    included: Array<{
        attributes: {
            values: Array<{
                value: number
            }>;
        };
    }>;
}

@Injectable({
    providedIn: 'root'
})
export class ElectricityPriceAPI implements ElectricityPriceRepository {
    // Para llamar a la API de REE se utiliza un proxy.
    private readonly apiUrl: string = '/apiree/es/datos/mercados/precios-mercados-tiempo-real';

    private readonly headers: HttpHeaders = new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    });

    constructor(private http: HttpClient) { }

    /**
     * Obtiene el precio de la electricidad en €/kWh.
     * @throws {ElectricityPriceNotFoundError} Si no hay datos disponibles o la API responde con formato incorrecto.
     * @throws {APIAccessError} Si hay un error accediendo a la API.
     */
    async getPrice(): Promise<number> {
        // Fecha de inicio y fin. De este modo solo se obtiene el resultado de la hora actual.
        const start: Date = new Date();
        start.setMinutes(0);

        const end = new Date(start);
        end.setMinutes(1);

        // La API requiere formato ISO, sólo horas y minutos
        const params = new HttpParams()
            .set('start_date', start.toISOString().slice(0, 16))
            .set('end_date', end.toISOString().slice(0, 16))
            .set('time_trunc', 'hour');

        const respuesta: ReeApiResponse = await this.getDataFromAPI<ReeApiResponse>(this.apiUrl, this.headers, params);
        const priceData = respuesta?.included?.[0]?.attributes?.values?.[0];

        // La respuesta no contiene el valor que buscamos
        if (!priceData || !priceData.value) {
            return -1;
        }

        // Comprueba que el precio obtenido es un número
        const precio = Number(priceData.value);
        if (isNaN(precio)) {
            return -1;
        }

        // El valor devuelto por la API está en €/MWh; se quiere en €/kWh
        return precio / 1000;
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
            throw new APIAccessError();
        }

        return respuesta;
    }
}

