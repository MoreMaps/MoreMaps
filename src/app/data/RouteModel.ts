import {Geohash} from 'geofire-common';

export enum TIPO_TRANSPORTE {
    COCHE = 'driving-car',
    A_PIE = 'foot-walking',
    BICICLETA = 'cycling-regular',
}

export enum PREFERENCIA {
    RAPIDA = 'fastest',
    CORTA = 'shortest',
    RECOMENDADA = 'recommended',
}

export class RouteModel {
    geohash_origen: Geohash;
    geohash_destino: Geohash;
    transporte: TIPO_TRANSPORTE;
    preferencia: PREFERENCIA;
    distancia: number;
    tiempo: number;
    alias?: string;
    pinned?: boolean;
    matricula?: string;

    constructor(geohash_origen: Geohash, geohash_destino: Geohash,
                transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA,
                distancia: number, tiempo: number,
                alias?: string, pinned?: boolean, matricula?: string) {
        this.geohash_origen = geohash_origen;
        this.geohash_destino = geohash_destino;
        this.transporte = transporte;
        this.preferencia = preferencia;
        this.distancia = distancia;
        this.tiempo = tiempo;
        if (alias !== undefined) {
            this.alias = alias;
        }
        if (pinned !== undefined) {
            this.pinned = pinned;
        } else this.pinned = false;
        if (matricula !== undefined) {
            this.matricula = matricula;
        }
    }

    toJSON() {
        return {
            geohash_origen: this.geohash_origen,
            geohash_destino: this.geohash_destino,
            transporte: this.transporte,
            preferencia: this.preferencia,
            distancia: this.distancia,
            tiempo: this.tiempo,
            ...(this.alias !== undefined ? {alias: this.alias} : {}),
            ...(this.pinned !== undefined ? {pinned: this.pinned} : {pinned: false}),
            ...(this.matricula !== undefined ? {matricula: this.matricula} : {}),
        }
    }

    static fromJSON(json: any): RouteModel {
        return new RouteModel(json.geohash_origen, json.geohash_destino, json.transporte, json.preferencia,
            json.distancia, json.tiempo, json.alias, json.pinned, json.matricula);
    }
}

