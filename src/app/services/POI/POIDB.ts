import {POIRepository} from './POIRepository';
import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash} from 'geofire-common';
import {
    collection,
    deleteDoc,
    doc,
    Firestore,
    getDoc,
    getDocs,
    setDoc,
    updateDoc
} from '@angular/fire/firestore';
import {MissingPOIError} from '../../errors/MissingPOIError';
import {DescriptionLengthError} from '../../errors/DescriptionLengthError';
import {DBAccessError} from '../../errors/DBAccessError';
import {POIAlreadyExistsError} from '../../errors/POIAlreadyExistsError';

@Injectable({
    providedIn: 'root'
})
export class POIDB implements POIRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    /**
     * Registra un punto de interés (POI) en la base de datos.
     * @param poi datos del POI (latitud, longitud, topónimo, geohash, alias, descripción, fijado)
     */
    async createPOI(poi: POIModel): Promise<POIModel> {
        const userUid = this.auth.currentUser!.uid;
        const path = `items/${userUid}/pois/${poi.geohash}`;

        try{
            // Referencia al documento
            const vehicleDocRef = doc(this.firestore, path);

            // Obtener el snapshot para ver si existe
            const docSnap = await getDoc(vehicleDocRef);

            // Si existe, lanzamos el error
            if (docSnap.exists()) throw new POIAlreadyExistsError();

            // Si no existe, procedemos a guardar
            await setDoc(vehicleDocRef, poi.toJSON());
            return poi;
        } catch(error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) {
                console.error("ERROR de Firebase: " + error);
                throw new DBAccessError(error);
            }
            // Si no, es un error propio y se puede propagar
            throw error;
        }
    }

    /**
     * Lee los datos de la base de datos correspondientes al punto de interés (POI) con el geohash especificado.
     * @param geohash geohash del POI
     */
    async readPOI(geohash: Geohash): Promise<POIModel> {


        try {
            const poiSnap = await getDoc(
                doc(this.firestore, `items/${this.auth.currentUser!.uid}/pois/${geohash}`)
            );

            if (!poiSnap.exists()) {
                throw new MissingPOIError();
            }

            // Devolver POI
            return POIModel.fromJSON(poiSnap.data());

        } catch (error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) {
                console.error("ERROR de Firebase: " + error);
                throw new DBAccessError(error);
            }
            // Si no, es un error propio y se puede propagar
            throw error;
        }
    }

    /**
     * Actualiza los datos de la base de datos correspondientes al punto de interés (POI) con el geohash especificado.
     * @param geohash geohash del POI
     * @param update datos a actualizar del POI
     */
    async updatePOI(geohash: Geohash, update: Partial<POIModel>): Promise<boolean> {

        try {
            // Obtener los datos del POI que se va a actualizar
            const poiRef = doc(this.firestore, `items/${this.auth.currentUser!.uid}/pois/${geohash}`);
            const poiSnap = await getDoc(poiRef);

            // Si no existe, se lanza un error
            if (!poiSnap.exists()) throw new MissingPOIError();

            // Comprobar reglas de negocio (el formulario también lo hace)
            // Descripción demasiado larga (>150 chars)
            if (update.description && update.description?.length > 150) throw new DescriptionLengthError();

            // Actualizar documento (únicamente los campos enviados)
            await updateDoc(poiRef, update);
            return true;
        } catch (error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) {
                console.error("ERROR de Firebase: " + error);
                throw new DBAccessError(error);
            }
            // Si no, es un error propio y se puede propagar
            throw error;
        }
    }

    /**
     * Elimina los datos de la base de datos correspondientes al punto de interés (POI) con el geohash especificado.
     * @param geohash geohash del POI
     */
    async deletePOI(geohash: Geohash): Promise<boolean> {

        try {
            // Obtener los datos del POI que se va a borrar
            const poiRef = doc(this.firestore, `items/${this.auth.currentUser!.uid}/pois/${geohash}`);
            const poiSnap = await getDoc(poiRef);

            // Si no existe, se lanza un error
            if (!poiSnap.exists()) throw new MissingPOIError();

            // Borrar documento
            // TODO: PROPAGAR A RUTAS
            await deleteDoc(poiRef);
            return true;
        } catch (error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) {
                console.error("ERROR de Firebase: " + error);
                throw new DBAccessError(error);
            }
            // Si no, es un error propio y se puede propagar
            throw error;
        }
    }

    /**
     * Devuelve una lista con todos los puntos de interés (POI).
     */
    async getPOIList(): Promise<POIModel[]> {
        let list: POIModel[] = [];

        // Referencia a la colección
        const collectionPath = `/items/${this.auth.currentUser!.uid}/pois`;

        try {
            // Obtener items de la colección
            const itemsRef = collection(this.firestore, collectionPath);
            const snapshot = await getDocs(itemsRef);

            if (!snapshot.empty) {
                list = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return POIModel.fromJSON(data);
                });
            }
        } catch(error) {
            console.error("ERROR de Firebase: " + error);
            throw new DBAccessError(error as string);
        }

        return list;
    }

    /**
     * Fija el punto de interés (POI) si no está fijado y viceversa.
     * @param poi datos completos del POI
     */
    async pinPOI(poi: POIModel): Promise<boolean> {

        // Referencia a la colección
        const docPath = `/items/${this.auth.currentUser!.uid}/pois/${poi.geohash}`;

        // Actualiza el documento para que invertir el boolean pinned del POI
        try {
            await updateDoc(doc(this.firestore, docPath), {pinned: !poi.pinned});
            poi.pinned = !poi.pinned;
            console.log(`Cambiado pinned de POI ${poi.geohash} a: ${poi.pinned}`)
            return true;
        } catch (error: any) {
            console.log(`Error al cambiar pinned del POI: ${error}`);
            switch (error.code) {
                case 'invalid-argument':
                case 'not-found':
                    throw new MissingPOIError();
            }
            throw error;
        }
    }
}
