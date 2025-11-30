import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {POI_REPOSITORY, POIRepository} from './POIRepository';
import {Auth} from '@angular/fire/auth';
import {Geohash, geohashForLocation} from 'geofire-common';
import {POISearchModel} from '../../data/POISearchModel';

@Injectable({ providedIn: 'root' })
export class POIService {
    private poiDb : POIRepository = inject(POI_REPOSITORY);

    // HU201 y HU202 Crear POI
    async createPOI(poi: POISearchModel): Promise<POIModel> {
        let poiForDB : POIModel = new POIModel(poi.lat, poi.lon, poi.placeName, geohashForLocation([poi.lat, poi.lon], 7));
        return this.poiDb.createPOI(poiForDB);
    }

    // HU203 Consultar lista de POI
    async getPOIList(user: Auth): Promise<POIModel[]> {
        return [];
    }

    // HU204 Consultar POI
    async readPOI(user: Auth, geohash: string): Promise<POIModel> {
        return new POIModel(-999, -999, "", "");
    }

    // HU205 Modificar información de POI
    async updatePOI(user: Auth, geohash: string, update: Partial<POIModel>): Promise<boolean> {
        return false;
    }

    // HU206 Eliminar POI
    async deletePOI(user: Auth, geohash: string): Promise<boolean> {
        return false;
    }

    // HU501 Fijar POI
    async pinPOI(user: Auth, poi: POIModel): Promise<boolean> {
        return false;
    }
}
