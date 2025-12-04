import {inject, Injectable} from '@angular/core';
import {VehicleRepository} from './VehicleRepository';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {collection, doc, Firestore, getDoc, getDocs, updateDoc} from '@angular/fire/firestore';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';
import {VehicleAlreadyExistsError} from '../../errors/Vehicle/VehicleAlreadyExistsError';

@Injectable({
    providedIn: 'root'
})
export class VehicleDB implements VehicleRepository {
    private firestore = inject(Firestore);

    async createVehicle(user: Auth, vehiculo: VehicleModel): Promise<VehicleModel> {
        return new VehicleModel("", "", "", "", 1, "", 0)
    }

    async getVehicleList(user: Auth): Promise<VehicleModel[]> {
        return [];
    }

    async updateVehicle(user: Auth, matricula: string, update: Partial<VehicleModel>): Promise<boolean> {
        // TODO: DESCOMENTAR EN MERGE CON IT03
        /*
        this.safetyChecks(user);
        this.properValues(vehiculo);
         */

        try {
            // Obtener los datos del vehículo que se va a actualizar
            const vehicleRef = doc(this.firestore, `/items/${user.currentUser?.uid}/vehicles/${matricula}`);
            const vehicleSnap = await getDoc(vehicleRef);

            // Si no existe, se lanza un error
            if (!vehicleSnap.exists()) throw new MissingVehicleError();

            // Comprobar reglas de negocio
            // Si la matrícula ya existe, lanzar un error
            const vehiclesSnap =
                await getDocs(collection(this.firestore, `/items/${user.currentUser?.uid}/vehicles`)
            );
            vehiclesSnap.forEach((vehicle) => {
                if (vehicle.data()['matricula'] === update?.matricula) throw new VehicleAlreadyExistsError();
            })

            // Actualizar documento (únicamente los campos enviados)
            await updateDoc(vehicleRef, update);
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
