import {InjectionToken} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Geohash} from 'geofire-common';
import {POISearchModel} from '../../data/POISearchModel';

export const POI_REPOSITORY = new InjectionToken<POIRepository>('POIRepository');

export interface POIRepository {
    // Operaciones CRUDE
    createPOI(poi: POISearchModel): Promise<POIModel>;

    readPOI(geohash: Geohash): Promise<POIModel>;
    // con este update podemos hacer checks manuales, y evitar cambios a otros atributos que no sean alias o descripción
    updatePOI(geohash: Geohash, update: Partial<POIModel>): Promise<boolean>;

    deletePOI(geohash: Geohash): Promise<boolean>;

    getPOIList(): Promise<POIModel[]>;

    pinPOI(poi: POIModel): Promise<boolean>;
}
