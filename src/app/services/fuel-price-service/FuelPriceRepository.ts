import {InjectionToken} from '@angular/core';
import {FUEL_TYPE} from '../../data/VehicleModel';

export const FUEL_PRICE_REPOSITORY = new InjectionToken<FuelPriceRepository>('FuelPriceRepository');

export type MapaCombustible = Map<FUEL_TYPE, number>;

export interface FuelPriceRepository {
    getPrice(type: FUEL_TYPE, map: MapaCombustible): Promise<number>;
    processStations(): Promise<MapaCombustible>;
}
