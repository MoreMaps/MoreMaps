import {inject, Injectable} from '@angular/core';
import {RouteRepository} from './RouteRepository';
import {Auth} from '@angular/fire/auth';
import {doc, Firestore, getDoc, setDoc} from '@angular/fire/firestore';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';
import {DBAccessError} from '../../errors/DBAccessError';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {RouteAlreadyExistsError} from '../../errors/Route/RouteAlreadyExistsError';

@Injectable({
    providedIn: 'root'
})
export class RouteDB implements RouteRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    async getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number): Promise<number> {
        return 0.0;
    }

    async createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, preferencia: PREFERENCIA, modelo?: RouteResultModel, matricula?: string): Promise<RouteModel> {
        this.safetyChecks();

        const userUid = this.auth.currentUser!.uid;
        const path = `items/${userUid}/routes/${origen}-${destino}-${matricula ? matricula : transporte}`;

        try{
            // Referencia al documento
            const routeDocRef = doc(this.firestore, path);

            // Obtener el snapshot para ver si existe
            const docSnap = await getDoc(routeDocRef);

            // Si existe, lanzamos el error
            if (docSnap.exists()) throw new RouteAlreadyExistsError();
5
            // Si no existe, procedemos a guardar
            const route = new RouteModel(origen, destino, transporte, preferencia, modelo?.distancia, modelo?.tiempo, '', false, matricula);
            await setDoc(routeDocRef, route.toJSON());
            return route;
        } catch(error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) {
                console.error("ERROR de Firebase: " + error);
                throw new DBAccessError();
            }
            // Si no, es un error propio y se puede propagar
            throw error;
        }
    }

    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        return false;
    }

    /**
     * Comprobación de sesión activa.
     * @private
     */
    private safetyChecks() {
        const currentUser = this.auth.currentUser!.uid;
        if (!currentUser) throw new SessionNotActiveError();
    }
}
