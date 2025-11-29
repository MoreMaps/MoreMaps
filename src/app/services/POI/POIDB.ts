import {POIRepository} from './POIRepository';
import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash} from 'geofire-common';
import {doc, Firestore, getDoc, setDoc} from '@angular/fire/firestore';
import {MissingPOIError} from '../../errors/MissingPOIError';
import {DescriptionLengthError} from '../../errors/DescriptionLengthError';

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
        return new POIModel(0, 0, "", "");
    }

    async updatePOI(user: Auth, geohash: Geohash, update: Partial<POIModel>): Promise<boolean> {
        try {
            // Obtener los datos del POI que se va a actualizar
            const poiRef = doc(this.firestore, `items/${user.currentUser?.uid}/pois/${geohash}`);
            const poiSnap = await getDoc(poiRef);

            // Si no existe, se lanza un error
            if (!poiSnap.exists()) throw new MissingPOIError();

            // Comprobar reglas de negocio (el formulario también lo hace)
            // Descripción demasiado larga (>150 chars)
            if (update.description && update.description?.length > 150) throw new DescriptionLengthError();

            // Actualizar documento (únicamente los campos enviados)
            await setDoc(poiRef, update, {merge: true});
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
