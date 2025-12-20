import {InjectionToken} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Geohash} from 'geofire-common';
import {POISearchModel} from '../../data/POISearchModel';

export const POI_REPOSITORY = new InjectionToken<POIRepository>('POIRepository');

export interface POIRepository {
    // Operaciones CRUDE
    createPOI(poi: POISearchModel): Promise<POIModel>;

    getPOI(geohash: Geohash): Promise<POIModel>;

    updatePOI(geohash: Geohash, update: Partial<POIModel>): Promise<boolean>;

    deletePOI(geohash: Geohash): Promise<boolean>;

    getPOIList(): Promise<POIModel[]>;

    // Fijar POI
    pinPOI(poi: POIModel): Promise<boolean>;

    // Métodos auxiliares
    poiExists(geohash: Geohash): Promise<boolean>;
}
