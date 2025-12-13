import {InjectionToken} from '@angular/core';
import {RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';

export const ROUTE_REPOSITORY = new InjectionToken<RouteRepository>('RouteRepository');

export interface RouteRepository {
    // Obtener el coste de una ruta
    getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number): Promise<number>;

    // Operaciones CRUDE
    // (por ahora solo crear y borrar)
    createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE,
                modelo: RouteResultModel, matricula?: string): Promise<RouteModel>;

    deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean>;
}
