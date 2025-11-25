import {POIRepository} from './POIRepository';
import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash, geohashForLocation} from 'geofire-common';
import {addDoc, deleteDoc, doc, Firestore, getDoc, setDoc} from '@angular/fire/firestore';
import {MissingPOIError} from '../../errors/MissingPOIError';
import {POISearchModel} from '../../data/POISearchModel';

@Injectable({
    providedIn: 'root'
})
export class POIDB implements POIRepository {
    private firestore = inject(Firestore);
    private auth = inject(Auth);

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
        try {
            // Obtener los datos del POI que se va a borrar
            const poiRef = doc(this.firestore, `items/${user.currentUser?.uid}/pois/${geohash}`);
            const poiSnap = await getDoc(poiRef);

            // Si no existe, se lanza un error
            if (!poiSnap.exists()) throw new MissingPOIError();

            // Borrar documento
            // TODO: PROPAGAR A RUTAS
            await deleteDoc(poiRef);
            return true;
        }

        catch (error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) {
                console.error("ERROR de Firebase: " + error);
                return false;
            }
            // Si no, es un error propio y se puede propagar
            throw error;
        }
    }

    async getPOIList(user: Auth): Promise<POIModel[]> {
        // el orden es pinned (desc), alias (asc) y placeName (asc)
        return [];
    }

    async pinPOI(user: Auth, poi: POIModel): Promise<boolean> {
        return false;
    }
}
