import {InjectionToken} from '@angular/core';
import {FUEL_TYPE} from '../../data/VehicleModel';


// Token para el repositorio que usa el servicio (cache)
export const FUEL_PRICE_REPOSITORY = new InjectionToken<FuelPriceRepository>('FuelPriceRepository');

// Token para la fuente de datos real (API)
export const FUEL_PRICE_SOURCE = new InjectionToken<FuelPriceRepository>('FuelPriceSource');

export type MapaCombustible = Map<FUEL_TYPE, number>;

export interface FuelPriceRepository {
    getPrice(type: FUEL_TYPE, map: MapaCombustible): Promise<number>;
    processStations(): Promise<MapaCombustible>;
}
