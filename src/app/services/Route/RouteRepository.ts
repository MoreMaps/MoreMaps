import {InjectionToken} from '@angular/core';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';

export const ROUTE_REPOSITORY = new InjectionToken<RouteRepository>('RouteRepository');

export interface RouteRepository {
    // Operaciones CRUDE
    createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA,
                modelo?: RouteResultModel, matricula?: string): Promise<RouteModel>;

    getRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<RouteModel>;

    updateRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, update: Partial<RouteModel>): Promise<RouteModel>;

    getRouteList(): Promise<RouteModel[]>;

    deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<boolean>;

    // Fijar ruta
    pinRoute(ruta: RouteModel): Promise<boolean>;

    // Métodos auxiliares
    routeExists(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<boolean>;
}
