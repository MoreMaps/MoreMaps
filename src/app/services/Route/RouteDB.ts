import {inject, Injectable} from '@angular/core';
import {RouteRepository} from './RouteRepository';
import {Auth} from '@angular/fire/auth';
import {Firestore} from '@angular/fire/firestore';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';

@Injectable({
    providedIn: 'root'
})
export class RouteDB implements RouteRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    async getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number): Promise<number> {
        return 0.0;
    }

    async createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, modelo: RouteResultModel, matricula?: string): Promise<RouteModel> {
        return new RouteModel('', '', TIPO_TRANSPORTE.BICICLETA, PREFERENCIA.CORTA, 0, 0);
    }

    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        return false;
    }
}
