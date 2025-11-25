import {InjectionToken} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash} from 'geofire-common';
import {POISearchModel} from '../../data/POISearchModel';

export const POI_REPOSITORY = new InjectionToken<POIRepository>('POIRepository');

export interface POIRepository {
    // CRUDE
    createPOI(poi: POISearchModel): Promise<POIModel>;
    readPOI(user: Auth, geohash: Geohash): Promise<POIModel>;
    // con este update podemos hacer checks manuales, y evitar cambios a otros atributos que no sean alias o descripción
    updatePOI(user: Auth, geohash: Geohash, update: Partial<POIModel>): Promise<boolean>;
    deletePOI(user: Auth, geohash: Geohash): Promise<boolean>;
    getPOIList(user: Auth): Promise<POIModel[]>;
    pinPOI(user: Auth, poi: POIModel): Promise<boolean>;
}
