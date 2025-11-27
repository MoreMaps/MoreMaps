import {Geohash} from 'geofire-common';

/**
 * ¿Cómo se guardan los POI en FireStore?
 *
 * /items/{uid}/pois/{geohash}, donde cada valor geohash se corresponde con un documento para poi.
 * GeoHash es un hash de 8 caracteres basado en la latitud y longitud de un punto geográfico. Con 8
 * caracteres garantiza una precision en un area de 38mx19m. Se puede hacer de 7, con 153m^2 de precisión
 *
 * Geohash es una libreria que hay que instalar usando npm install geofire-common.
 * GeoFire tiene una función llamada geoHashForLocation([lat,lon], precision:int)
 *
 * Usaremos el geohash para la ruta, y lo guardaremos también en el documento como tal
 * */
export class POIModel {
    lat: number;            // 6 decimales
    lon: number;            // 4 decimales
    placeName: string;      // topónimo dado por la API, debe existir
    geohash: Geohash;       // geohash de 7 decimales dado por Geofire, debe existir
    alias?: string;         // definido por el usuario, puede no existir si el usuario no ha definido nada
    description?: string;   // hasta 150 caracteres
    pinned?: boolean;       // true si fijado, false si no fijado

    constructor(lat: number, lon: number, placeName: string, geohash: string, pinned?: boolean, alias?: string, description?: string) {
        this.lat = lat;
        this.lon = lon;
        this.placeName = placeName;
        this.geohash = geohash;
        if (alias !== undefined) {
            this.alias = alias;
        }
        if (description !== undefined) {
            this.description = description;
        }
        if (pinned !== undefined) {
            this.pinned = pinned;
        } else this.pinned = false;
    }

    toJSON?() {
        return {
            lat: this.lat,
            lon: this.lon,
            placeName: this.placeName,
            geohash: this.geohash,
            ...(this.alias !== undefined ? {alias: this.alias} : {}),
            ...(this.description !== undefined ? {description: this.description} : {}),
            ...(this.pinned !== undefined ? {pinned: this.pinned} : {pinned: false})
        }
    }
}

