import {InjectionToken} from '@angular/core';

// Token para el repositorio que usa el servicio (cache)
export const ELECTRICITY_PRICE_REPOSITORY = new InjectionToken<ElectricityPriceRepository>('ElectricityPriceRepository');

// Token para la fuente de datos real (API)
export const ELECTRICITY_PRICE_SOURCE = new InjectionToken<ElectricityPriceRepository>('ElectricityPriceSource');

export interface ElectricityPriceRepository {
    getPrice(): Promise<number>;
}
