import {inject, Injectable} from '@angular/core';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';
import {ROUTE_REPOSITORY, RouteRepository} from './RouteRepository';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {ElectricityPriceService} from '../electricity-price-service/electricity-price-service';
import {FuelPriceService} from '../fuel-price-service/fuel-price-service';
import {InvalidDataError} from '../../errors/InvalidDataError';
import {USER_REPOSITORY, UserRepository} from '../User/UserRepository';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {RouteAlreadyExistsError} from '../../errors/Route/RouteAlreadyExistsError';
import {MissingRouteError} from '../../errors/Route/MissingRouteError';

export interface RouteCostResult {
    cost: number;
    unit: '€' | 'kCal';
}

@Injectable({providedIn: 'root'})
export class RouteService {
    private routeDb: RouteRepository = inject(ROUTE_REPOSITORY);
    private userDb: UserRepository = inject(USER_REPOSITORY);
    private electricityPriceService: ElectricityPriceService = inject(ElectricityPriceService);
    private fuelPriceService: FuelPriceService = inject(FuelPriceService);

    // HU402-403: Obtener coste asociado a ruta
    /**
     * Obtiene el coste (en € o kCal) asociado a una ruta.
     * @param ruta
     * @param transporte
     * @param consumoMedio
     * @param tipoCombustible
     * @throws ElectricityPriceNotFoundError Si la llamada a electricityPriceService falla.
     * @throws FuelPriceNotFoundError Si la llamada a fuelPriceService falla.
     * @throws APIAccessError Si hay un error accediendo a la API.
     * @throws InvalidDataError Si faltan parámetros o son incorrectos.
     */
    async getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number,
                       tipoCombustible?: FUEL_TYPE): Promise<RouteCostResult> {
        if (ruta.distancia < 0 || ruta.tiempo < 0 ){
            throw new InvalidDataError();
        }

        const tiempoH = ruta.tiempo / 3600;         // tiempo en horas
        const distanciaKm = ruta.distancia / 1000;  // distancia en km

        const kCalPie = 200;                        // kCal/h a pie
        const kCalBici = 400;                       // kCal/h en bici

        switch (transporte) {
            case TIPO_TRANSPORTE.A_PIE:
                return { cost: tiempoH * kCalPie, unit: 'kCal' };

            case TIPO_TRANSPORTE.BICICLETA:
                return { cost: tiempoH * kCalBici, unit: 'kCal' };

            case TIPO_TRANSPORTE.VEHICULO:
                // Si faltan datos, se devuelve 0
                if (consumoMedio === undefined || consumoMedio < 0 || !tipoCombustible ) {
                    console.error('Faltan datos para calcular el coste del vehículo.');
                    throw new InvalidDataError();
                }

                const cantidadEnergia = (distanciaKm / 100) * consumoMedio; // en l o kW
                let precio: number;

                // Coches eléctricos o híbridos
                if (tipoCombustible === FUEL_TYPE.ELECTRICO || tipoCombustible === FUEL_TYPE.HEV) {
                    // Usamos getElectricityPrice() acorde a tu definición del servicio de electricidad
                    precio = await this.electricityPriceService.getPrice();
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
    /**
     * Crea una ruta nueva.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta).
     * @param matricula Matrícula del vehículo (opcional).
     * @param preferencia Preferencia de la ruta (más corta/económica, más rápida, etc.).
     * @param modelo Resultado de la búsqueda (duración, distancia de la ruta).
     * @returns El RouteModel guardado.
     * @throws SessionNotActiveError Si la sesión no está activa.
     * @throws RouteAlreadyExistsError Si ya existe la ruta.
     */
    async createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA, modelo?: RouteResultModel, matricula?: string): Promise<RouteModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que la ruta NO exista
        if (await this.routeDb.routeExists(origen, destino, transporte)) {
            throw new RouteAlreadyExistsError();
        }

        // Crea la ruta
        return this.routeDb.createRoute(origen, destino, transporte, preferencia, modelo, matricula);
    }

    // HU408: Listar rutas
    /**
     * Lista las rutas del usuario
     */
    async getRouteList(): Promise<RouteModel[]> {
        return undefined as any;
    }

    // HU409: Consultar ruta
    /**
     * Consulta los datos de una ruta concreta.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta).
     */
    async readRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<RouteModel> {
        return new RouteModel('', '', transporte, PREFERENCIA.RECOMENDADA);
    }

    // HU410: Eliminar ruta
    /**
     * Elimina una ruta existente.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta).
     * @returns Promise con true si se borra, false si no.
     * @throws SessionNotActiveError Si la sesión no está activa.
     * @throws MissingRouteError Si no existe la ruta.
     */
    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que la ruta exista
        if (!await this.routeDb.routeExists(origen, destino, transporte)) {
            throw new MissingRouteError();
        }

        // Borra la ruta
        return this.routeDb.deleteRoute(origen, destino, transporte);
    }

    // HU411: Modificar ruta
    /**
     * Modifica los datos de una ruta concreta. Téngase en cuenta que los cambios NO afectan al coste de la ruta.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta).
     * @param update Partial con los atributos que se van a actualizar.
     * @returns Promise con la ruta actualizada.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws MissingRouteError si la ruta no existe.
     */
    async updateRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, update: Partial<RouteModel>): Promise<RouteModel> {
        return new RouteModel('', '', transporte, PREFERENCIA.RECOMENDADA);
    }

    // HU503 Fijar ruta
    /**
     * Fija una ruta específica.
     * @param ruta La ruta a fijar.
     * @returns Promise con true si se ha fijado, false si no.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws MissingRouteError si la ruta no existe.
     */
    async pinRoute(ruta: RouteModel): Promise<boolean> {
        return false;
    }
}
