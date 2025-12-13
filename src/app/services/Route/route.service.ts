import {inject, Injectable} from '@angular/core';
import {RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';
import {ROUTE_REPOSITORY, RouteRepository} from './RouteRepository';

@Injectable({providedIn: 'root'})
export class RouteService {
    private routeDb: RouteRepository = inject(ROUTE_REPOSITORY);

    // HU402-403: Obtener coste asociado a ruta
    async getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number): Promise<number> {
        return 10.0;
    }

    // HU407: Guardar ruta
    async createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, modelo: RouteResultModel, matricula?: string): Promise<RouteModel> {
        return this.routeDb.createRoute(origen, destino, transporte, modelo, matricula);
    }

    // HU410: Eliminar ruta
    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        return this.routeDb.deleteRoute(origen, destino, transporte, matricula);
    }
}
