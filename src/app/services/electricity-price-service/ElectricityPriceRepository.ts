import {InjectionToken} from '@angular/core';

export const ELECTRICITY_PRICE_REPOSITORY = new InjectionToken<ElectricityPriceRepository>('ElectricityPriceRepository');

export interface ElectricityPriceRepository {
    /**
     * Obtiene el precio de la electricidad en €/kWh.
     */
    getPrice(): Promise<number>;
}
