import {POIRepository} from './POIRepository';
import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash} from 'geofire-common';
import {doc, Firestore, getDoc} from '@angular/fire/firestore';
import {MissingPOIError} from '../../errors/MissingPOIError';

@Injectable({
    providedIn: 'root'
})
export class POIDB implements POIRepository {
    private firestore = inject(Firestore);

    async createPOI(lat: number, lon: number, placeName: string): Promise<POIModel> {
        // geohash de 7 decimales se crea aquí
        return new POIModel(0, 0, "", "");
    }

    async readPOI(user: Auth, geohash: Geohash): Promise<POIModel> {
        try {
            const poiSnap = await getDoc(
                doc(this.firestore, `items/${user.currentUser?.uid}/pois/${geohash}`)
            );

            if (!poiSnap.exists()) {
                throw new MissingPOIError();
            }

            // Devolver POI
            return POIModel.fromJSON(poiSnap.data());

        } catch (error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) console.error("ERROR de Firebase: " + error);
            throw error;
        }
    }

    async updatePOI(user: Auth, geohash: Geohash, update: Partial<POIModel>): Promise<boolean> {
        return false;
    }

    async deletePOI(user: Auth, geohash: Geohash): Promise<boolean> {
        return false;
    }

    async getPOIList(user: Auth): Promise<POIModel[]> {
        // el orden es pinned (desc), alias (asc) y placeName (asc)
        return [];
    }

    async pinPOI(user: Auth, poi: POIModel): Promise<boolean> {
        return false;
    }
}
