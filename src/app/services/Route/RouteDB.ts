import {inject, Injectable} from '@angular/core';
import {RouteRepository} from './RouteRepository';
import {Auth} from '@angular/fire/auth';
import {deleteDoc, doc, Firestore, getDoc} from '@angular/fire/firestore';
import {PREFERENCIA, RouteModel, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash} from 'geofire-common';
import {RouteResultModel} from '../../data/RouteResultModel';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {DBAccessError} from '../../errors/DBAccessError';
import {MissingRouteError} from '../../errors/Route/MissingRouteError';

@Injectable({
    providedIn: 'root'
})
export class RouteDB implements RouteRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    async getRouteCost(ruta: RouteResultModel, transporte: TIPO_TRANSPORTE, consumoMedio?: number): Promise<number> {
        return 0.0;
    }

    async createRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, modelo: RouteResultModel, matricula?: string): Promise<RouteModel> {
        return new RouteModel('', '', TIPO_TRANSPORTE.BICICLETA, PREFERENCIA.CORTA, 0, 0);
    }

    async deleteRoute(origen: Geohash, destino: Geohash, transporte: TIPO_TRANSPORTE, matricula?: string): Promise<boolean> {
        this.safetyChecks();

        try {
            // Obtener los datos del POI que se va a borrar
            const routeRef = doc(this.firestore, `items/${this.auth.currentUser!.uid}/routes/${origen}-${destino}-${matricula ? matricula : transporte}`);
            const routeSnap = await getDoc(routeRef);

            // Si no existe, se lanza un error
            if (!routeSnap.exists()) throw new MissingRouteError();

            // Borrar documento
            await deleteDoc(routeRef);
            return true;
        } catch (error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) {
                console.error("ERROR de Firebase: " + error);
                throw new DBAccessError();
            }
            // Si no, es un error propio y se puede propagar
            throw error;
        }
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
