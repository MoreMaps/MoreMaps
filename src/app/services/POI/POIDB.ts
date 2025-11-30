import {POIRepository} from './POIRepository';
import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash} from 'geofire-common';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {collection, doc, Firestore, getDocs, query, getDoc, setDoc, updateDoc} from '@angular/fire/firestore';
import {ForbiddenContentError} from '../../errors/ForbiddenContentError';
import {MissingPOIError} from '../../errors/MissingPOIError';
import {DescriptionLengthError} from '../../errors/DescriptionLengthError';

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
        this.safetyChecks(user);

        // Referencia a la colección
        let collectionPath: string;
        // El if-else es necesario para evitar errores al compilar. Se comprueba en safetyChecks()
        if (user.currentUser) collectionPath = `/items/${user.currentUser.uid}/pois`;
        else throw new SessionNotActiveError();

        // Obtener items de la colección
        const itemsRef = collection(this.firestore, collectionPath);
        const q = query(itemsRef);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return [];
        }
        else {
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return new POIModel(
                    data['lat'],
                    data['lon'],
                    data['placeName'],
                    data['geohash'],
                    data['pinned'] ?? false,
                    data['alias'],
                    data['description']
                );
            });
        }
    }

    async pinPOI(user: Auth, poi: POIModel): Promise<boolean> {
        this.safetyChecks(user);

        // Referencia a la colección
        let docPath: string;
        // El if-else es necesario para evitar errores al compilar. Se comprueba en safetyChecks()
        if (user.currentUser) docPath = `/items/${user.currentUser.uid}/pois/${poi.geohash}`;
        else throw new SessionNotActiveError();

        // Actualiza el documento para que invertir el boolean pinned del POI
        try {
            await updateDoc(doc(this.firestore, docPath), {pinned: !poi.pinned});
            poi.pinned = !poi.pinned;
            console.log(`Cambiado pinned de POI ${poi.geohash} a: ${poi.pinned}`)
            return true;
        } catch (error: any) {
            console.log(`Error al cambiar pinned del POI: ${error}`);
            switch(error.code) {
                case 'invalid-argument':
                case 'not-found':
                    throw new MissingPOIError();
            }
            throw error;
        }
    }

    private safetyChecks(user: Auth) {
        const authUser = this.auth.currentUser;

        // si el usuario pasado por argumento o el de auth no existen...
        if (!authUser || !user.currentUser) {
            throw new SessionNotActiveError();
        }

        // si el usuario pasado por argumento y el de auth no coinciden
        if (authUser.uid !== user.currentUser?.uid) {
            throw new ForbiddenContentError();
        }
    }
}
