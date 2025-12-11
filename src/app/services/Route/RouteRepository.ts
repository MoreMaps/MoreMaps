import {InjectionToken} from '@angular/core';
import {RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';

export const ROUTE_REPOSITORY = new InjectionToken<RouteRepository>('RouteRepository');

export interface RouteRepository {
    // HU402-403: Conocer coste de ruta
    getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number): Promise<number>;

    // HU407: Crear ruta
    createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE,
                modelo: RouteResultModel, matricula?: string): Promise<RouteModel>;

    // HU410: Eliminar ruta
    deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean>;
}
