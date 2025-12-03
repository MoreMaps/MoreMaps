import {inject, Injectable} from '@angular/core';
import {VehicleRepository} from './VehicleRepository';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {deleteDoc, doc, Firestore, getDoc} from '@angular/fire/firestore';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';

@Injectable({
    providedIn: 'root'
})
export class VehicleDB implements VehicleRepository {
    private firestore = inject(Firestore);

    async createVehicle(user: Auth, vehiculo: VehicleModel): Promise<VehicleModel> {
        return new VehicleModel("", "12", "", "", 0, "", 0);
    }

    async getVehicleList(user: Auth): Promise<VehicleModel[]> {
        return [];
    }

    async updateVehicle(user: Auth, matricula: string, vehicle: Partial<VehicleModel>): Promise<boolean> {
        return false;
    }

    async deleteVehicle(user: Auth, matricula: string): Promise<boolean> {
        try {
            // Obtener los datos del POI que se va a borrar
            const vehicleRef = doc(this.firestore, `items/${user.currentUser?.uid}/vehicles/${matricula}`);
            const vehicleSnap = await getDoc(vehicleRef);

            // Si no existe, se lanza un error
            if (!vehicleSnap.exists()) throw new MissingVehicleError();

            // Borrar documento
            // TODO: PROPAGAR A RUTAS
            await deleteDoc(vehicleRef);
            return true;
        } catch (error: any) {
            // Si el error es de Firebase, loguearlo
            if (error.code) {
                console.error("ERROR de Firebase: " + error);
                return false;
            }
            // Si no, es un error propio y se puede propagar
            throw error;
        }
    }

    async readVehicle(user: Auth, matricula: string): Promise<VehicleModel> {
        return new VehicleModel("", "21", "", "", 0, "", 0);
    }

    async pinVehicle(user: Auth, matricula: string): Promise<boolean> {
        return false;
    }
}
