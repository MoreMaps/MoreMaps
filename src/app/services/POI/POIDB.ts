import {POIRepository} from './POIRepository';
import {inject, Injectable} from '@angular/core';
import {POIModel} from '../../data/POIModel';
import {Auth} from '@angular/fire/auth';
import {Geohash} from 'geofire-common';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {collection, Firestore, getDocs, query} from '@angular/fire/firestore';
import {ForbiddenContentError} from '../../errors/ForbiddenContentError';

@Injectable({
    providedIn: 'root'
})
export class POIDB implements POIRepository {
    private firestore = inject(Firestore);
    private auth = inject(Auth);

    async createPOI(lat: number, lon: number, placeName: string): Promise<POIModel> {
        // geohash de 7 decimales se crea aquí
        return new POIModel(0, 0, "", "");
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
        const authUser = this.auth.currentUser;

        if (!authUser) {
            throw new SessionNotActiveError();
        }

        // Comprobar que el usuario registrado y el que consulta son el mismo
        if (authUser.uid !== user.currentUser?.uid) {
            throw new ForbiddenContentError();
        }

        // Referencia a la colección
        let collectionPath: string;
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
        return false;
    }
}
