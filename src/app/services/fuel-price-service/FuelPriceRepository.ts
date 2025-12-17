import {InjectionToken} from '@angular/core';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {FuelStation} from './FuelPriceAPI';

export const FUEL_PRICE_REPOSITORY = new InjectionToken<FuelPriceRepository>('FuelPriceRepository');

export type MapaCombustible = Map<FUEL_TYPE, number>;

export interface FuelPriceRepository {
    /**
     * Obtiene el precio de un tipo de combustible.
     * @param type Tipo de combustible (ej: "Gasolina")
     * @param map Mapa de tipo (FUEL_TYPE: Map<string, number>) con los precios de cada combustible
     */
    getPrice(type: FUEL_TYPE, map: MapaCombustible): Promise<number>;

    processStations(): Promise<MapaCombustible>;
}
