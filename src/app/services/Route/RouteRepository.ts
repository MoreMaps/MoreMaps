import {InjectionToken} from '@angular/core';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';

export const ROUTE_REPOSITORY = new InjectionToken<RouteRepository>('RouteRepository');

export interface RouteRepository {
    // Operaciones CRUDE
    createRoute(origen: Geohash, destino: Geohash, alias: string, transporte: TIPO_TRANSPORTE,
                nombreOrigen: string, nombreDestino: string,
                preferencia: PREFERENCIA, modelo: RouteResultModel, matricula?: string): Promise<RouteModel>;

    getRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<RouteModel>;

    updateRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE,
                update: Partial<RouteModel>, matricula?: string): Promise<RouteModel>;

    getRouteList(): Promise<RouteModel[]>;

    deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean>;

    // Borrar todos los elementos
    clear(): Promise<boolean>;

    // Fijar ruta
    pinRoute(ruta: RouteModel): Promise<boolean>;

    // Métodos auxiliares
    routeExists(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean>;
    getRoutesUsingVehicle(matricula: string): Promise<RouteModel[]>;
    getRoutesUsingPOI(geohash: Geohash): Promise<RouteModel[]>;
}
