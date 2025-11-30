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

    async createPOI(poi: POIModel): Promise<POIModel> {
        const userUid = this.auth.currentUser?.uid;
        const poiDocRef = doc(this.firestore, `items/${userUid}/pois/${poi.geohash}`);
        await setDoc(poiDocRef, poi.toJSON());

        return poi;
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
