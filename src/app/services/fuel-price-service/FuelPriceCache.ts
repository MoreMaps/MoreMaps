import {inject, Injectable} from '@angular/core';
import {FUEL_PRICE_SOURCE, FuelPriceRepository, MapaCombustible} from './FuelPriceRepository';
import {FUEL_TYPE} from '../../data/VehicleModel';


@Injectable({
    providedIn: 'root'
})
export class FuelPriceCache implements FuelPriceRepository {
    private source: FuelPriceRepository = inject(FUEL_PRICE_SOURCE);

    // Mapa guardado en caché
    private mapaPrecios$: MapaCombustible | null = null;
    private lastFetchTime: number = 0;

    async getPrice(type: FUEL_TYPE, map: MapaCombustible): Promise<number> {
        return this.source.getPrice(type, map);
    }

    /**
     * Gestiona la caché.
     * Si la caché es válida, devuelve los datos en memoria.
     * Si no, hace la petición HTTP.
     * @throws {FuelPriceNotFoundError} Si no hay datos disponibles o la API responde con formato incorrecto.
     * @throws {APIAccessError} Si hay un error accediendo a la API.
     */
    async processStations(): Promise<MapaCombustible> {
        const now = Date.now();

        // Verificar si existe caché y si no ha caducado
        if (!this.mapaPrecios$ || this.cacheUpdateNecessary()) {
            this.lastFetchTime = now;
            this.mapaPrecios$ = await this.source.processStations();
        }
        return this.mapaPrecios$;
    }

    /**
     * Comprueba si es necesario actualizar la caché.
     * @private
     */
    private cacheUpdateNecessary(): boolean {
        const now = new Date();
        const startOfCurrent30MinBlock = new Date(now);

        if (now.getMinutes() >= 30) {
            // Si son las XX:30 - XX:59, el bloque empezó a las XX:30
            startOfCurrent30MinBlock.setMinutes(30, 0, 0);
        } else {
            // Si son las XX:00 - XX:29, el bloque empezó a las XX:00
            startOfCurrent30MinBlock.setMinutes(0, 0, 0);
        }

        return this.lastFetchTime < startOfCurrent30MinBlock.getTime();
    }
}

