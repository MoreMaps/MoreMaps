import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {POI_REPOSITORY, POIRepository} from './POIRepository';
import {Auth} from '@angular/fire/auth';
import {Geohash} from 'geofire-common';

@Injectable({ providedIn: 'root' })
export class POIService {
    private poiDb : POIRepository = inject(POI_REPOSITORY);

    // HU201 y HU202 Crear POI
    async createPOI(lat: number, lon: number, placeName: string): Promise<POIModel> {
        return new POIModel(0, 0, "", "");
    }

    // HU203 Consultar lista de POI
    async getPOIList(user: Auth): Promise<POIModel[]> {
        return [];
    }

    // HU204 Consultar POI
    async readPOI(user: Auth, geohash: Geohash): Promise<POIModel> {
        return this.poiDb.readPOI(user, geohash);
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
