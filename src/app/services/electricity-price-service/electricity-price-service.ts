import {inject, Injectable} from '@angular/core';
import {ELECTRICITY_PRICE_REPOSITORY, ElectricityPriceRepository} from './ElectricityPriceRepository';
import {ElectricityPriceNotFoundError} from '../../errors/Route/ElectricityPriceNotFoundError';

@Injectable({ providedIn: 'root' })
export class ElectricityPriceService {
    private electricityPriceAPI: ElectricityPriceRepository = inject(ELECTRICITY_PRICE_REPOSITORY);

    /**
     * Obtiene el precio de la electricidad en €/kWh.
     * @returns El precio de la electricidad.
     * @throws {ElectricityPriceNotFoundError} Si no hay datos disponibles o la API responde con formato incorrecto.
     */
    async getPrice(): Promise<number> {
        const price = await this.electricityPriceAPI.getPrice();

        // Precio inválido
        if (price === -1) {
            throw new ElectricityPriceNotFoundError();
        }

        return price;
    }
}
