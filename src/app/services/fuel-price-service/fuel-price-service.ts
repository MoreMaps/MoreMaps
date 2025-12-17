import {inject, Injectable} from '@angular/core';
import {FUEL_PRICE_REPOSITORY, FuelPriceRepository} from './FuelPriceRepository';
import {FUEL_TYPE} from '../../data/VehicleModel';

@Injectable({ providedIn: 'root' })
export class FuelPriceService {
    private fuelPriceAPI: FuelPriceRepository = inject(FUEL_PRICE_REPOSITORY);

    /**
     * Obtiene el precio del combustible en €/L ó €/Kg.
     */
    async getPrice(type: FUEL_TYPE): Promise<number> {
        const map = await this.fuelPriceAPI.processStations();
        return this.fuelPriceAPI.getPrice(type, map);
    }
}
