import { inject, Injectable } from '@angular/core';
import { ElectricityPriceRepository, ELECTRICITY_PRICE_SOURCE } from './ElectricityPriceRepository';

@Injectable({
    providedIn: 'root'
})
export class ElectricityPriceCache implements ElectricityPriceRepository {
    private source: ElectricityPriceRepository = inject(ELECTRICITY_PRICE_SOURCE);

    // Precio guardado en caché
    private cachedPrice: number | null = null;
    private lastFetchTime: number = 0;

    /**
     * Gestiona la caché.
     * Si la caché es válida, devuelve los datos en memoria.
     * Si no, hace la petición HTTP.
     * @throws {ElectricityPriceNotFoundError} Si no hay datos disponibles o la API responde con formato incorrecto.
     * @throws {APIAccessError} Si hay un error accediendo a la API.
     */
    async getPrice(): Promise<number> {
        const now = Date.now();

        // Verificar si existe caché y si no ha caducado
        if (!this.cachedPrice || this.cacheUpdateNecessary()) {
            this.cachedPrice = await this.source.getPrice();
            this.lastFetchTime = now;
        }
        return this.cachedPrice;
    }

    /**
     * Comprueba si es necesario actualizar la caché.
     * @private
     */
    private cacheUpdateNecessary(): boolean {
        const now = new Date();
        const startOfCurrentHour = new Date(now.setMinutes(0, 0, 0));
        return this.lastFetchTime < startOfCurrentHour.getTime();
    }
}

