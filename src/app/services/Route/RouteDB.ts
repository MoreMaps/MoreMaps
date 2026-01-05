import {inject, Injectable} from '@angular/core';
import {RouteRepository} from './RouteRepository';
import {Auth} from '@angular/fire/auth';
import {
    collection,
    deleteDoc,
    doc,
    Firestore,
    getDoc,
    getDocs,
    or,
    query,
    setDoc, updateDoc,
    where, writeBatch
} from '@angular/fire/firestore';
import {RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {DBAccessError} from '../../errors/DBAccessError';

@Injectable({
    providedIn: 'root'
})
export class RouteDB implements RouteRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    /**
     * Crea una ruta nueva.
     * @param route Ruta a insertar en la BD.
     */
    async createRoute(route: RouteModel): Promise<RouteModel> {
        const routeId = RouteModel.buildId(route.geohash_origen, route.geohash_destino, route.transporte, route.matricula);
        const path = `items/${this.auth.currentUser!.uid}/routes/${routeId}`;

        try{
            // Referencia al documento
            const routeDocRef = doc(this.firestore, path);

            // Crea el documento
            await setDoc(routeDocRef, route.toJSON());
            return route;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            throw new DBAccessError();
        }
    }

    /**
     * Lee los datos de la base de datos correspondientes a la ruta especificada.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     * @param matricula Matricula del vehículo (si ese es el transporte)
     */
    async getRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<RouteModel> {
        const routeId = RouteModel.buildId(origen, destino, transporte, matricula);
        const path = `items/${this.auth.currentUser!.uid}/routes/${routeId}`;

        try {
            // Documento del POI
            const routeSnap = await getDoc(doc(this.firestore, path));

            // Devolver POI
            return RouteModel.fromJSON(routeSnap.data());
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            throw new DBAccessError();
        }
    }

    /**
     * Actualiza los datos de la base de datos correspondientes a la ruta especificada.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     * @param update Partial con los datos a actualizar.
     * @param matricula Matrícula del vehículo (si ese es el tipo de transporte)
     */
    async updateRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, update: Partial<RouteModel>, matricula?: string): Promise<RouteModel> {
        const oldId = RouteModel.buildId(origen, destino, transporte, matricula);
        const oldPath = `items/${this.auth.currentUser!.uid}/routes/${oldId}`;

        try {
            // Obtenemos el doc. actual para tener los datos completos
            const oldDocRef = doc(this.firestore, oldPath);
            const snapshot = await getDoc(oldDocRef);

            const currentRoute = RouteModel.fromJSON(snapshot.data());

            // Preparamos el nuevo objeto fusionando los datos
            const updatedRoute = new RouteModel(
                currentRoute.geohash_origen,
                currentRoute.geohash_destino,
                update.alias ?? currentRoute.alias,
                update.transporte ?? currentRoute.transporte,
                currentRoute.nombre_origen,
                currentRoute.nombre_destino,
                update.preferencia ?? currentRoute.preferencia,
                update.distancia ?? currentRoute.distancia,
                update.tiempo ?? currentRoute.tiempo,
                currentRoute.pinned, // pinned va por separado, se mantiene
                update.matricula ?? currentRoute.matricula
            );

            // Verificamos si cambia el ID (transporte)
            const newId = updatedRoute.id();
            if (newId !== oldId) {
                const newPath = `items/${this.auth.currentUser!.uid}/routes/${newId}`;

                // Usamos un batch para que sea una operación atómica
                const batch = writeBatch(this.firestore);
                batch.delete(oldDocRef);
                batch.set(doc(this.firestore, newPath), updatedRoute.toJSON());
                await batch.commit();
            } else {
                // Si el ID no cambia, es un update normal
                await updateDoc(oldDocRef, update);
            }

            return updatedRoute;
        } catch (error: any) {
            throw new DBAccessError();
        }
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
            throw new DBAccessError();
        }
    }

    /**
     * Fija la ruta si no está fijada y viceversa.
     * @param ruta datos completos de la ruta
     */
    async pinRoute(ruta: RouteModel): Promise<boolean> {
        // Lectura de la ruta registrada.
        const route: RouteModel = await this.getRoute(ruta.geohash_origen, ruta.geohash_destino, ruta.transporte, ruta.matricula);

        // Ruta para actualizar la ruta.
        const path: string = `/items/${this.auth.currentUser!.uid}/routes/${ruta.id()}`;

        // Actualización del documento, invirtiendo "pinned".
        try {
            await updateDoc(doc(this.firestore, path), {pinned: !route.pinned});
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            throw new DBAccessError();
        }
    }


    /**
     * Elimina una ruta concreta.
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     * @param matricula Matrícula del vehículo (si ese es el tipo de transporte)
     */
    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        const routeId = RouteModel.buildId(origen, destino, transporte, matricula);
        const path = `items/${this.auth.currentUser!.uid}/routes/${routeId}`;
        try {
            // Obtener los datos de la ruta que se va a borrar
            const routeRef = doc(this.firestore, path);

            // Borrar documento
            await deleteDoc(routeRef);
            return true;
        }
            // Ha ocurrido un error inesperado en Firebase.
        catch (error: any) {
            throw new DBAccessError();
        }
    }

    /**
     * Borra todas las rutas del usuario actual de forma atómica.
     */
    async clear(): Promise<boolean> {
        const routes = await getDocs(query(collection(this.firestore, `items/${this.auth.currentUser?.uid}/routes`)));

        try {
            // Transacción
            const batch = writeBatch(this.firestore);
            routes.forEach(route => {
                batch.delete(route.ref);
            });

            // Fin de la transacción
            await batch.commit();
            return true;
        }
            // Ha ocurrido un error inesperado en Firebase.
        catch (error: any) {
            throw new DBAccessError();
        }
    }


    /**
     * Comprueba si existe una ruta como la que se va a guardar
     * @param origen Geohash del POI de origen.
     * @param destino Geohash del POI de destino.
     * @param transporte Tipo de transporte (vehículo, a pie, bicicleta)
     * @param matricula Matrícula del vehículo (si ese es el tipo de transporte)
     * @returns Promise con true si existe, false si no existe
     */
    async routeExists(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        const routeId = RouteModel.buildId(origen, destino, transporte, matricula);
        const path = `items/${this.auth.currentUser!.uid}/routes/${routeId}`;
        const docRef = doc(this.firestore, path);
        const snap = await getDoc(docRef);
        return snap.exists();
    }

    /**
     * Devuelve las rutas que utilizan un POI determinado.
     * @param geohash El Geohash del POI (origen o destino) elegido
     */
    async getRoutesUsingPOI(geohash: Geohash): Promise<RouteModel[]> {
        // Obtener todas las rutas cuyo origen o destino sea el geohash del POI escogido
        const routesWithPOI = query(
            collection(this.firestore, `items/${this.auth.currentUser!.uid}/routes`),
            or(where('geohash_origen', '==', geohash), where('geohash_destino', '==', geohash))
        );
        const querySnapshot = await getDocs(routesWithPOI);

        // Mapear a lista de RouteModel
        let list: RouteModel[] = [];
        if (!querySnapshot.empty) {
            list = querySnapshot.docs.map(doc => {
                return RouteModel.fromJSON(doc.data());
            });
        }
        return list;
    }

    /**
     * Devuelve las rutas que utilizan un vehículo determinado.
     * @param matricula La matrícula elegida
     */
    async getRoutesUsingVehicle(matricula: string): Promise<RouteModel[]> {
        // Obtener todas las rutas cuyo vehículo
        const routesWithVehicle = query(
            collection(this.firestore, `items/${this.auth.currentUser!.uid}/routes`),
            where('matricula', '==', matricula)
        );
        const querySnapshot = await getDocs(routesWithVehicle);

        // Mapear a lista de RouteModel
        let list: RouteModel[] = [];
        if (!querySnapshot.empty) {
            list = querySnapshot.docs.map(doc => {
                return RouteModel.fromJSON(doc.data());
            });
        }
        return list;
    }
}
