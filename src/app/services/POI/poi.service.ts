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
        // Obtener lista llamando a Firebase
        let fireList = await this.poiDb.getPOIList(user)
        if (fireList.length > 0) {
            fireList.sort((a, b) => {
                // 1. Primero ordenar por pinned (true > false)
                if (a.pinned !== b.pinned) {
                    return a.pinned ? -1 : 1;
                }
                // 2. Luego ordenar alfabéticamente por alias o placeName
                const nameA = this.getDisplayName(a).toLowerCase();
                const nameB = this.getDisplayName(b).toLowerCase();
                return nameA.localeCompare(nameB, 'es', {sensitivity: 'base'});
            });
            return fireList;
        }
        return [];
    }

    private getDisplayName(item: POIModel): string {
        // Usar alias si existe y no está vacío, sino usar placeName
        return (item.alias && item.alias.trim() !== '') ? item.alias : item.placeName;
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
        return await this.poiDb.pinPOI(user, poi);
    }
}
