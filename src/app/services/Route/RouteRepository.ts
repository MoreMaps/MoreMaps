import {InjectionToken} from '@angular/core';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';

export const ROUTE_REPOSITORY = new InjectionToken<RouteRepository>('RouteRepository');

export interface RouteRepository {
    // Operaciones CRUDE
    // (por ahora solo crear y borrar)
    createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA,
                modelo?: RouteResultModel, matricula?: string): Promise<RouteModel>;

    deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<boolean>;

    // Métodos auxiliares
    routeExists(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<boolean>;
}
