import {inject, Injectable} from '@angular/core';
import {RouteRepository} from './RouteRepository';
import {Auth} from '@angular/fire/auth';
import {collection, deleteDoc, doc, Firestore, getDoc, getDocs, query, setDoc} from '@angular/fire/firestore';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';
import {DBAccessError} from '../../errors/DBAccessError';

@Injectable({
    providedIn: 'root'
})
export class RouteDB implements RouteRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    /**
     * Crea una ruta nueva.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param alias Alias de la Ruta.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     * @param preferencia Preferencia de la ruta (más corta/económica, más rápida, etc.)
     * @param modelo Resultado de la búsqueda (duración, distancia de la ruta)
     * @param matricula Matrícula del vehículo (opcional)
     */
    async createRoute(origen: Geohash, destino: Geohash, alias: string, transporte: TIPO_TRANSPORTE,
                      preferencia: PREFERENCIA, modelo: RouteResultModel, matricula?: string): Promise<RouteModel> {
        const path = `items/${this.auth.currentUser!.uid}/routes/${origen}-${destino}-${transporte}`;

        try{
            // Referencia al documento
            const routeDocRef = doc(this.firestore, path);

            // Crear nuevo RouteModel
            const route = new RouteModel(origen, destino, alias, transporte, preferencia, modelo.distancia,
                modelo.tiempo, false, matricula);

            await setDoc(routeDocRef, route.toJSON());
            return route;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Lee los datos de la base de datos correspondientes a la ruta especificada.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     */
    async readRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<RouteModel> {
        throw new Error("Method not implemented.");
    }

    /**
     * Actualiza los datos de la base de datos correspondientes a la ruta especificada.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     * @param update Partial con los datos a actualizar.
     */
    async updateRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, update: Partial<RouteModel>): Promise<RouteModel> {
        throw new Error("Method not implemented.");
    }

    /**
     * Devuelve una lista con todas las rutas del usuario actual.
     */
    async getRouteList(): Promise<RouteModel[]> {
        const path: string = `/items/${this.auth.currentUser!.uid}/routes`;
        try {
            // Obtener items de la colección
            const itemsRef = collection(this.firestore, path);
            const snapshot = await getDocs(query(itemsRef));

            // Mapear a lista de RouteModel
            let list: RouteModel[] = [];
            if (!snapshot.empty) {
                list = snapshot.docs.map(doc => {
                    return RouteModel.fromJSON(doc.data());
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
     * Fija la ruta si no está fijada y viceversa.
     * @param ruta datos completos de la ruta
     */
    async pinRoute(ruta: RouteModel): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    /**
     * Elimina una ruta concreta.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     */
    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<boolean> {
        const path = `items/${this.auth.currentUser!.uid}/routes/${origen}-${destino}-${transporte}`;
        try {
            // Obtener los datos de la ruta que se va a borrar
            const routeRef = doc(this.firestore, path);

            // Borrar documento
            await deleteDoc(routeRef);
            return true;
        }
            // Ha ocurrido un error inesperado en Firebase.
        catch (error: any) {
            console.error("ERROR de Firebase: " + error);
            throw new DBAccessError();
        }
    }

    /**
     * Comprueba si existe una ruta como la que se va a guardar
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     * @returns Promise con true si existe, false si no existe
     */
    async routeExists(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE): Promise<boolean> {
        const path = `items/${this.auth.currentUser!.uid}/routes/${origen}-${destino}-${transporte}`;
        const docRef = doc(this.firestore, path);
        const snap = await getDoc(docRef);
        return snap.exists();
    }
}
