import {POIRepository} from './POIRepository';
import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash, geohashForLocation} from 'geofire-common';
import {POISearchModel} from '../../data/POISearchModel';
import {doc, Firestore, setDoc} from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})
export class POIDB implements POIRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    async createPOI(poi: POISearchModel): Promise<POIModel> {
        // geohash de 7 caracteres en base a las coordenadas
        const geohash: Geohash = geohashForLocation([poi.lat, poi.lon], 7);

        const poiRegistrado: POIModel = new POIModel(poi.lat, poi.lon, poi.placeName, geohash);

        const userUid = this.auth.currentUser?.uid;
        const poiDocRef = doc(this.firestore, `items/${userUid}/pois/${geohash}`);
        await setDoc(poiDocRef, poiRegistrado.toJSON());

        return poiRegistrado;
    }

    async readPOI(user: Auth, geohash: Geohash): Promise<POIModel> {
        return new POIModel(0, 0, "", "");
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
