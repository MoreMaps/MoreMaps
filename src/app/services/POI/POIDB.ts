import {POIRepository} from './POIRepository';
import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash} from 'geofire-common';
import {
    collection,
    doc,
    Firestore,
    getDoc,
    getDocs, query,
    setDoc,
    updateDoc, writeBatch
} from '@angular/fire/firestore';
import {DBAccessError} from '../../errors/DBAccessError';
import {ROUTE_REPOSITORY, RouteRepository} from '../Route/RouteRepository';
import {RouteModel} from '../../data/RouteModel';

@Injectable({
    providedIn: 'root'
})
export class POIDB implements POIRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private routeDb: RouteRepository = inject(ROUTE_REPOSITORY);

    /**
     * Registra un punto de interés (POI) en la base de datos.
     * @param poi Datos del POI (latitud, longitud, topónimo, geohash).
     */
    async createPOI(poi: POIModel): Promise<POIModel> {
        try{
            // Referencia al documento
            const poiDocRef = doc(this.firestore, `items/${this.auth.currentUser?.uid}/pois/${poi.geohash}`);

            // Crear POI
            await setDoc(poiDocRef, poi.toJSON());
            return poi;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Lee los datos de la base de datos correspondientes al punto de interés (POI) con el geohash especificado.
     * @param geohash Geohash del POI.
     */
    async getPOI(geohash: Geohash): Promise<POIModel> {
        try {
            // Documento del POI
            const poiSnap = await getDoc(
                doc(this.firestore, `items/${this.auth.currentUser!.uid}/pois/${geohash}`)
            );

            // Devolver POI
            return POIModel.fromJSON(poiSnap.data());
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Actualiza los datos de la base de datos correspondientes al punto de interés (POI) con el geohash especificado.
     * @param geohash Geohash del POI.
     * @param update Partial con los datos a actualizar.
     */
    async updatePOI(geohash: Geohash, update: Partial<POIModel>): Promise<boolean> {
        try {
            // Obtener los datos del POI que se va a actualizar
            const poiRef = doc(this.firestore, `items/${this.auth.currentUser!.uid}/pois/${geohash}`);

            // Actualizar documento (únicamente los campos enviados)
            await updateDoc(poiRef, update);
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Elimina los datos de la base de datos correspondientes al punto de interés (POI) con el geohash especificado.
     * @param geohash Geohash del POI.
     */
    async deletePOI(geohash: Geohash): Promise<boolean> {
        try {
            // Obtener los datos del POI que se va a borrar
            const poiRef = doc(this.firestore, `items/${this.auth.currentUser!.uid}/pois/${geohash}`);

            // Borrar todas las rutas que utilizan el POI Y el documento
            const routes = await this.routeDb.getRoutesUsingPOI(geohash);
            const batch = writeBatch(this.firestore);
            for (const route of routes) {
                const path = `items/${this.auth.currentUser!.uid}/routes/` + RouteModel.buildId(route.geohash_origen, route.geohash_destino, route.transporte, route.matricula);
                console.log(path);
                batch.delete(doc(this.firestore, path));
            }
            batch.delete(poiRef);

            // Fin de la transacción
            await batch.commit();
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Borra todos los POI del usuario actual de forma atómica.
     */
    async clear(): Promise<boolean> {
        const pois = await getDocs(query(collection(this.firestore, `items/${this.auth.currentUser?.uid}/pois`)));

        try {
            // Transacción
            const batch = writeBatch(this.firestore);
            pois.forEach(poi => {
                batch.delete(poi.ref);
            });

            // Fin de la transacción
            await batch.commit();
            return true;
        }
            // Ha ocurrido un error inesperado en Firebase.
        catch (error: any) {
            console.error('Error al obtener respuesta de Firebase: ' + error);
            return false;
        }
    }


    /**
     * Devuelve una lista con todos los puntos de interés (POI) del usuario actual.
     */
    async getPOIList(): Promise<POIModel[]> {
        try {
            // Obtener items de la colección
            const itemsRef = collection(this.firestore,  `items/${this.auth.currentUser!.uid}/pois`);
            const snapshot = await getDocs(itemsRef);

            // Mapear todos los documentos a POIModel
            let list: POIModel[] = [];
            if (!snapshot.empty) {
                list = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return POIModel.fromJSON(data);
                });
            }
            return list;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Fija el punto de interés (POI) si no está fijado y viceversa.
     * @param poi datos completos del POI
     */
    async pinPOI(poi: POIModel): Promise<boolean> {
        // Actualiza el documento para que invertir el boolean pinned del POI
        try {
            await updateDoc(doc(this.firestore, `items/${this.auth.currentUser!.uid}/pois/${poi.geohash}`), {pinned: !poi.pinned});
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Recibe un geohash y comprueba si existe un POI en Firestore que lo utilice
     * @param geohash Geohash de un POI
     * @returns Promise con true si existe, false si no existe
     */
    async poiExists(geohash: Geohash): Promise<boolean> {
        const path = `items/${this.auth.currentUser?.uid}/pois/${geohash}`;
        const docRef = doc(this.firestore, path);
        const snap = await getDoc(docRef);
        return snap.exists();
    }
}
