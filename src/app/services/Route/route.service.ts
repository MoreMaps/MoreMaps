import {inject, Injectable} from '@angular/core';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';
import {ROUTE_REPOSITORY, RouteRepository} from './RouteRepository';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {ElectricityPriceService} from '../electricity-price-service/electricity-price-service';
import {FuelPriceService} from '../fuel-price-service/fuel-price-service';
import {InvalidDataError} from '../../errors/InvalidDataError';

export interface RouteCostResult {
    cost: number;
    unit: '€' | 'kCal';
}

@Injectable({providedIn: 'root'})
export class RouteService {
    private routeDb: RouteRepository = inject(ROUTE_REPOSITORY);
    private electrictyPriceService: ElectricityPriceService = inject(ElectricityPriceService);
    private fuelPriceService: FuelPriceService = inject(FuelPriceService);

    // HU402-403: Obtener coste asociado a ruta
    /**
     * Obtiene el coste (en € o kCal) asociado a una ruta.
     * @param ruta
     * @param transporte
     * @param consumoMedio
     * @param tipoCombustible
     * @throws {ElectricityPriceNotFoundError} Si la llamada a electrictyPriceService falla.
     * @throws {FuelPriceNotFoundError} Si la llamada a fuelPriceService falla.
     * @throws {APIAccessError} Si hay un error accediendo a la API.
     */
    async getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number,
                       tipoCombustible?: FUEL_TYPE): Promise<RouteCostResult> {
        if( ruta.distancia < 0 || ruta.tiempo < 0 ) {
            throw new InvalidDataError();
        }

        const distanciaKm = ruta.distancia / 1000; // en km

        // todo en HU403: a pie y bici
        switch (transporte) {
            case TIPO_TRANSPORTE.A_PIE:
                return { cost: 10.0, unit: 'kCal' };

            case TIPO_TRANSPORTE.BICICLETA:
                return { cost: 10.0, unit: 'kCal' };

            case TIPO_TRANSPORTE.VEHICULO:
                // Si faltan datos, se devuelve 0
                if (consumoMedio === undefined || !tipoCombustible ) {
                    console.warn('Faltan datos para calcular el coste del vehículo.');
                    return { cost: 0, unit: '€' };
                }

                const cantidadEnergia = (distanciaKm / 100) * consumoMedio; // en l o kW
                let precio: number;

                // Coches eléctricos o híbridos
                if (tipoCombustible === FUEL_TYPE.ELECTRICO || tipoCombustible === FUEL_TYPE.HEV) {
                    // Usamos getElectricityPrice() acorde a tu definición del servicio de electricidad
                    precio = await this.electrictyPriceService.getPrice();
                }
                // Otros tipos de coches
                else {
                    // Si es PHEV, para el cálculo de combustible se utiliza gasolina.
                    const combustibleQuery: FUEL_TYPE = (tipoCombustible === FUEL_TYPE.PHEV) ? FUEL_TYPE.GASOLINA : tipoCombustible;
                    precio = await this.fuelPriceService.getPrice(combustibleQuery);
                }

                const total = precio * cantidadEnergia;
                return { cost: total, unit: '€' };

            default:
                return { cost: 0, unit: '€' };
        }
    }

    // HU407: Guardar ruta
    async createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA, modelo?: RouteResultModel, matricula?: string): Promise<RouteModel> {
        return this.routeDb.createRoute(origen, destino, transporte, preferencia, modelo, matricula);
    }

    // HU410: Eliminar ruta
    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        return false;
    }
}
