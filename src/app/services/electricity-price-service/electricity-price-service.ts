import {inject, Injectable} from '@angular/core';
import {ELECTRICITY_PRICE_REPOSITORY, ElectricityPriceRepository} from './ElectricityPriceRepository';

@Injectable({ providedIn: 'root' })
export class ElectricityPriceService {
    private electricityPriceAPI: ElectricityPriceRepository = inject(ELECTRICITY_PRICE_REPOSITORY);

    /**
     * Obtiene el precio de la electricidad en €/kWh.
     * @returns El precio de la electricidad.
     */
    async getPrice(): Promise<number> {
        return this.electricityPriceAPI.getPrice();
    }
}
