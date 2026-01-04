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
import {WrongParamsError} from '../../errors/WrongParamsError';
import {MapSearchService} from '../map/map-search-service/map-search.service';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';

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
    private mapService: MapSearchService = inject(MapSearchService);

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
        if (ruta.distancia < 0 || ruta.tiempo < 0) {
            throw new InvalidDataError();
        }

        const tiempoH = ruta.tiempo / 3600;         // tiempo en horas
        const distanciaKm = ruta.distancia / 1000;  // distancia en km

        const kCalPie = 200;                        // kCal/h a pie
        const kCalBici = 400;                       // kCal/h en bici

        switch (transporte) {
            case TIPO_TRANSPORTE.A_PIE:
                return {cost: tiempoH * kCalPie, unit: 'kCal'};

            case TIPO_TRANSPORTE.BICICLETA:
                return {cost: tiempoH * kCalBici, unit: 'kCal'};

            case TIPO_TRANSPORTE.VEHICULO:
                // Si faltan datos, se devuelve 0
                if (consumoMedio === undefined || consumoMedio < 0 || !tipoCombustible ) {
                    throw new WrongParamsError('ruta para calcular el coste del vehículo');
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
                return {cost: total, unit: '€'};

            default:
                return {cost: 0, unit: '€'};
        }
    }

    // HU407: Guardar ruta
    /**
     * Crea una ruta nueva.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param alias Alias por defecto de la ruta.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta).
     * @param nombreOrigen Nombre del POI de origen.
     * @param nombreDestino Nombre del POI de destino.
     * @param matricula Matrícula del vehículo (opcional).
     * @param preferencia Preferencia de la ruta (más corta/económica, más rápida, etc.).
     * @param modelo Resultado de la búsqueda (duración, distancia de la ruta).
     * @returns El RouteModel guardado.
     * @throws SessionNotActiveError Si la sesión no está activa.
     * @throws RouteAlreadyExistsError Si ya existe la ruta.
     */
    async createRoute(origen: Geohash, destino: Geohash, alias: string, transporte: TIPO_TRANSPORTE,
                      nombreOrigen: string, nombreDestino: string,
                      preferencia: PREFERENCIA, modelo: RouteResultModel, matricula?: string): Promise<RouteModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que la ruta NO exista
        if (await this.routeDb.routeExists(origen, destino, transporte, matricula)) {
            throw new RouteAlreadyExistsError();
        }

        // Crea la ruta
        const route = new RouteModel(origen, destino, alias, transporte, nombreOrigen, nombreDestino,
            preferencia, modelo!.distancia, modelo!.tiempo, false, matricula);
        return this.routeDb.createRoute(route);
    }

    // HU408: Listar rutas
    /**
     * Lista las rutas del usuario
     */
    async getRouteList(): Promise<RouteModel[]> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Obtener lista de rutas
        let routeList: RouteModel[] = await this.routeDb.getRouteList();
        if (routeList.length > 0) {
            routeList.sort((a, b) => {
                // Ordenar por pinned (true > false)
                if (a.pinned !== b.pinned) {
                    return a.pinned ? -1 : 1;
                }
                // Ordenar alfabéticamente por alias
                return a.alias.localeCompare(b.alias, 'es', {sensitivity: 'base'});
            });
            return routeList;
        }
        return [];
    }

    // HU409: Consultar ruta
    /**
     * Consulta los datos de una ruta concreta.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta).
     * @param matricula Matrícula del vehículo (si ese es el medio de transporte)
     * @throws SessionNotActiveError Si la sesión no está activa.
     * @throws MissingRouteError Si no existe la ruta.
     */
    async readRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<RouteModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que la ruta exista
        if (!await this.routeDb.routeExists(origen, destino, transporte, matricula)) {
            throw new MissingRouteError();
        }

        // Obtiene la ruta
        return this.routeDb.getRoute(origen, destino, transporte, matricula);
    }

    // HU410: Eliminar ruta
    /**
     * Elimina una ruta existente.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta).
     * @param matricula Matrícula del vehículo (si ese es el medio de transporte).
     * @returns Promise con true si se borra, false si no.
     * @throws SessionNotActiveError Si la sesión no está activa.
     * @throws MissingRouteError Si no existe la ruta.
     */
    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que la ruta exista
        if (!await this.routeDb.routeExists(origen, destino, transporte, matricula)) {
            throw new MissingRouteError();
        }

        // Borra la ruta
        return this.routeDb.deleteRoute(origen, destino, transporte, matricula);
    }

    /**
     * Elimina todas las rutas del usuario de forma atómica.
     * @returns Promise con true si se han borrado, o false si no se han borrado.
     */
    async clear(): Promise<boolean> {
        return await this.routeDb.clear();
    }

    // HU411: Modificar ruta
    /**
     * Modifica los datos de una ruta concreta. Téngase en cuenta que los cambios NO afectan al coste de la ruta.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta).
     * @param update Partial con los atributos que se van a actualizar.
     * @param matriculaOriginal Matrícula del vehículo original (si el medio de transporte original era vehículo)
     * @returns Promise con la ruta actualizada.
     * @throws SessionNotActiveError si la sesión no está activa.
     * @throws MissingRouteError si la ruta original no existe.
     * @throws RouteAlreadyExistsError si la nueva ruta ya existe.
     */
    async updateRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, update: Partial<RouteModel>, matriculaOriginal?: string): Promise<RouteModel> {
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que la ruta original existe
        if (!await this.routeDb.routeExists(origen, destino, transporte, matriculaOriginal)) {
            throw new MissingRouteError();
        }

        // 1. Identificar si hay un cambio en la identidad de la ruta
        const nuevoTransporte = update.transporte ?? transporte;
        const nuevaMatricula = update.hasOwnProperty('matricula') ? update.matricula : matriculaOriginal;

        const cambiaIdentidad = nuevoTransporte !== transporte || nuevaMatricula !== matriculaOriginal;

        // 2. Solo comprobar existencia si la identidad está cambiando
        if (cambiaIdentidad) {
            const yaExisteDestino = await this.routeDb.routeExists(
                origen,
                destino,
                nuevoTransporte,
                nuevaMatricula
            );

            if (yaExisteDestino) {
                throw new RouteAlreadyExistsError();
            }
        }

        // Obtenemos la ruta original ANTES de hacer nada para comparar
        const rutaOriginal = await this.routeDb.getRoute(origen, destino, transporte, matriculaOriginal);

        // Comprobamos si hay cambios reales
        const aliasCambia = update.alias && update.alias !== rutaOriginal.alias;
        const transporteCambia = update.transporte && update.transporte !== rutaOriginal.transporte;
        const preferenciaCambia = update.preferencia && update.preferencia !== rutaOriginal.preferencia;

        // La matrícula requiere cuidado: puede venir undefined si cambiamos a "A PIE", o ser igual
        // Comparamos solo si update trae la propiedad (aunque sea undefined)
        const matriculaCambia = update.matricula !== rutaOriginal.matricula &&
            (update.matricula !== undefined || rutaOriginal.matricula !== undefined);

        if (!aliasCambia && !transporteCambia && !preferenciaCambia && !matriculaCambia) {
            // No hay ningún cambio efectivo
            throw new InvalidDataError();
        }

        // Si se actualizan el transporte o la preferencia, el tiempo y la distancia pueden cambiar
        if (transporteCambia || preferenciaCambia) {
            // Obtenemos la ruta original para sacar los defaults
            const nuevoTransporte = update.transporte ?? rutaOriginal.transporte;
            const nuevaPreferencia = update.preferencia ?? rutaOriginal.preferencia;

            // Recalculamos usando el MapService (API Externa)
            try {
                const nuevoCalculo = await this.mapService.searchRoute(
                    origen,
                    destino,
                    nuevoTransporte,
                    nuevaPreferencia,
                );

                // Actualizamos los campos de cálculo
                update.distancia = nuevoCalculo.distancia;
                update.tiempo = nuevoCalculo.tiempo;
            } catch (e) {
                if (e instanceof ImpossibleRouteError) throw e;
                console.error("Error recalculando la ruta al actualizar: ", e);
                throw new InvalidDataError();
            }
        }
        // Llamada al repositorio
        return this.routeDb.updateRoute(origen, destino, transporte, update, matriculaOriginal);
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
        // Comprueba que la sesión está activa
        if (!await this.userDb.sessionActive()) {
            throw new SessionNotActiveError();
        }

        // Comprueba que el vehículo exista
        if (!await this.routeDb.routeExists(ruta.geohash_origen, ruta.geohash_destino, ruta.transporte, ruta.matricula)) {
            throw new MissingRouteError();
        }

        // Fijar vehículo
        return this.routeDb.pinRoute(ruta);
    }
}
