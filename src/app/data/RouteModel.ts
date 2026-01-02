import {Geohash} from 'geofire-common';

export enum TIPO_TRANSPORTE {
    VEHICULO = 'driving-car',
    A_PIE = 'foot-walking',
    BICICLETA = 'cycling-regular',
}

export const mapaTransporte: Record<TIPO_TRANSPORTE, string> = {
    [TIPO_TRANSPORTE.VEHICULO]: 'en coche',
    [TIPO_TRANSPORTE.BICICLETA]: 'en bici',
    [TIPO_TRANSPORTE.A_PIE]: 'a pie',
};

export enum PREFERENCIA {
    RAPIDA = 'fastest',
    CORTA = 'shortest',
    RECOMENDADA = 'recommended',
}

export const mapaPreferencia: Record<PREFERENCIA, string> = {
    [PREFERENCIA.RAPIDA]: 'más rápida',
    [PREFERENCIA.CORTA]: 'más corta',
    [PREFERENCIA.RECOMENDADA]: 'recomendada',
};

export class RouteModel {
    geohash_origen: Geohash;
    geohash_destino: Geohash;
    alias: string;
    transporte: TIPO_TRANSPORTE;
    nombre_origen: string;
    nombre_destino: string;
    preferencia: PREFERENCIA;
    distancia: number;
    tiempo: number;
    pinned?: boolean;
    matricula?: string;

    constructor(geohash_origen: Geohash, geohash_destino: Geohash, alias: string, transporte: TIPO_TRANSPORTE, nombre_origen: string, nombre_destino: string,
                preferencia: PREFERENCIA, distancia: number, tiempo: number, pinned?: boolean, matricula?: string) {
        this.geohash_origen = geohash_origen;
        this.geohash_destino = geohash_destino;
        this.alias = alias;
        this.transporte = transporte;
        this.nombre_origen = nombre_origen;
        this.nombre_destino = nombre_destino;
        this.preferencia = preferencia;
        this.distancia = distancia;
        this.tiempo = tiempo;
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
            alias: this.alias,
            transporte: this.transporte,
            nombre_origen: this.nombre_origen,
            nombre_destino: this.nombre_destino,
            preferencia: this.preferencia,
            distancia: this.distancia,
            tiempo: this.tiempo,
            ...(this.pinned !== undefined ? {pinned: this.pinned} : {pinned: false}),
            ...(this.matricula !== undefined ? {matricula: this.matricula} : {}),
        }
    }

    static fromJSON(json: any): RouteModel {
        return new RouteModel(json.geohash_origen, json.geohash_destino, json.alias, json.transporte,
            json.nombre_origen, json.nombre_destino, json.preferencia, json.distancia, json.tiempo, json.pinned, json.matricula);
    }

    static buildId(origen: string, destino: string, transporte: string, matricula?: string): string {
        if (transporte === TIPO_TRANSPORTE.VEHICULO && matricula) {
            return `${origen}-${destino}-${matricula}`;
        }
        return `${origen}-${destino}-${transporte}`;
    }

    id(): string {
        return RouteModel.buildId(this.geohash_origen, this.geohash_destino, this.transporte, this.matricula);
    }

    // Devuelve la etiqueta equivalente del transporte de la ruta
    transportLabel() {
        return mapaTransporte[this.transporte];
    }

    // Devuelve la etiqueta equivalente a la preferencia de la ruta
    preferenceLabel() {
        return mapaPreferencia[this.preferencia];
    }
}

