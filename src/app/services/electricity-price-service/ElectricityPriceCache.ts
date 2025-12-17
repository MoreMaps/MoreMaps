import {inject, Injectable} from '@angular/core';
import { ElectricityPriceRepository } from './ElectricityPriceRepository';
import {ElectricityPriceAPI} from './ElectricityPriceAPI';

@Injectable({
    providedIn: 'root'
})
export class ElectricityPriceCache implements ElectricityPriceRepository {
    private api: ElectricityPriceRepository = inject(ElectricityPriceAPI);

    // Precio guardado en caché
    private precio$: number = 0;
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
        // todo: eliminar logs
        if (!this.precio$ || this.cacheUpdateNecessary()) {
            console.log('🌐 Descargando datos de la API (electricidad)...');
            this.precio$ = await this.api.getPrice();
            this.lastFetchTime = now;
        }
        else{
            console.log('⚡ Recuperando datos de caché (electricidad)...');
        }
        return this.precio$;
    }

    /**
     * Comprueba si es necesario actualizar la caché.
     * @private
     */
    private cacheUpdateNecessary(): boolean {
        const now = new Date();
        const startOfCurrentHour = new Date(now);
        startOfCurrentHour.setMinutes(0, 0, 0);
        return this.lastFetchTime < startOfCurrentHour.getTime();
    }
}

