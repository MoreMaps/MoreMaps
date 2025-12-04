import {inject, Injectable} from '@angular/core';
import {VehicleRepository} from './VehicleRepository';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {collection, Firestore, getDocs, query} from '@angular/fire/firestore';
import {POIModel} from '../../data/POIModel';
import {ForbiddenContentError} from '../../errors/ForbiddenContentError';

@Injectable({
    providedIn: 'root'
})
export class VehicleDB implements VehicleRepository {
    private auth = inject(Auth);
    private firestore = inject(Firestore);


    async createVehicle(user: Auth, vehiculo: VehicleModel): Promise<VehicleModel> {
        return new VehicleModel("", "12", "", "", 0, "", 0);
    }

    async getVehicleList(): Promise<VehicleModel[]> {
        if (!this.auth.currentUser){
            throw new SessionNotActiveError();
        }

        let list: VehicleModel[] = [];
        const path: string = `/items/${this.auth.currentUser.uid}/vehicles`;

        // Obtener items de la colección
        const itemsRef = collection(this.firestore, path);
        const snapshot = await getDocs(query(itemsRef));

        if(!snapshot.empty){
            list = snapshot.docs.map(doc => {
                const data = doc.data();
                return new VehicleModel(
                    data['alias'],
                    data['matricula'],
                    data['marca'],
                    data['modelo'],
                    data['anyo'],
                    data['tipoCombustible'],
                    data['consumoMedio'],
                    data['pinned'],
                );
            });
        }

        return list;
    }

    async updateVehicle(user: Auth, matricula: string, vehicle: Partial<VehicleModel>): Promise<boolean> {
        return false;
    }

    async deleteVehicle(user: Auth, matricula: string): Promise<boolean> {
        return false;
    }

    async readVehicle(user: Auth, matricula: string): Promise<VehicleModel> {
        return new VehicleModel("", "21", "", "", 0, "", 0);
    }

    async pinVehicle(user: Auth, matricula: string): Promise<boolean> {
        return false;
    }
}
