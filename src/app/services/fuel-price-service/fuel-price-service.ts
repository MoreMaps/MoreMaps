import {inject, Injectable} from '@angular/core';
import {FUEL_PRICE_REPOSITORY, FuelPriceRepository} from './FuelPriceRepository';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {FuelPriceNotFoundError} from '../../errors/Route/FuelPriceNotFoundError';

@Injectable({ providedIn: 'root' })
export class FuelPriceService {
    private fuelPriceAPI: FuelPriceRepository = inject(FUEL_PRICE_REPOSITORY);

    /**
     * Obtiene el precio de un tipo de combustible.
     * @param type Tipo de combustible (ej: "Gasolina").
     * @throws {FuelPriceNotFoundError} Si no hay datos disponibles para el tipo de gasolina.
     * @returns El precio del tipo de gasolina.
     */
    async getPrice(type: FUEL_TYPE): Promise<number> {
        const map = await this.fuelPriceAPI.processStations();
        const price = await this.fuelPriceAPI.getPrice(type, map);

        // Precio inválido
        if (price === -1) {
            throw new FuelPriceNotFoundError();
        }

        return price;
    }
}
