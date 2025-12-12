import {Injectable} from '@angular/core';
import {RouteModel, TIPO_TRANSPORTE, PREFERENCIA} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';

@Injectable({providedIn: 'root'})
export class RouteService {

    // HU402-403: Obtener coste asociado a ruta
    async getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number): Promise<number> {
        return 0.0;
    }

    // HU407: Guardar ruta
    async createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, modelo: RouteResultModel, matricula?: string): Promise<RouteModel> {
        return new RouteModel('', '', TIPO_TRANSPORTE.BICICLETA, PREFERENCIA.CORTA, 0, 0);
    }

    // HU410: Eliminar ruta
    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        return false;
    }
}
