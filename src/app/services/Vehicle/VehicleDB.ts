import {inject, Injectable} from '@angular/core';
import {VehicleRepository} from './VehicleRepository';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {doc, Firestore, getDoc, updateDoc, writeBatch} from '@angular/fire/firestore';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';
import {VehicleAlreadyExistsError} from '../../errors/Vehicle/VehicleAlreadyExistsError';

@Injectable({
    providedIn: 'root'
})
export class VehicleDB implements VehicleRepository {
    private firestore = inject(Firestore);
    private auth = inject(Auth);

    async createVehicle(user: Auth, vehiculo: VehicleModel): Promise<VehicleModel> {
        return new VehicleModel("", "", "", "", 1, "", 0)
    }

    async getVehicleList(user: Auth): Promise<VehicleModel[]> {
        return [];
    }

    async updateVehicle(matricula: string, update: Partial<VehicleModel>): Promise<boolean> {
        // TODO: DESCOMENTAR EN MERGE CON IT03
        /*
        this.properValues(update);
         */

        try {
            // Obtener los datos del vehículo que se va a actualizar
            const oldVehicleRef = doc(this.firestore, `/items/${this.auth.currentUser?.uid}/vehicles/${matricula}`);
            const oldVehicleSnap = await getDoc(oldVehicleRef);

            // Si no existe el vehículo a modificar, se lanza un error
            if (!oldVehicleSnap.exists()) throw new MissingVehicleError();

            // Detectar si estamos cambiando la matrícula (ID del doc)
            const newMatricula = update.matricula;
            const isRenaming = newMatricula && newMatricula !== matricula;

            if (isRenaming) {
                const newVehicleRef = doc(this.firestore, `/items/${this.auth.currentUser?.uid}/vehicles/${newMatricula}`);
                const newVehicleSnap = await getDoc(newVehicleRef);
                console.log(newVehicleRef.path)
                if (newVehicleSnap.exists()) throw new VehicleAlreadyExistsError();

                // lote atómico
                const batch = writeBatch(this.firestore);

                const oldData = oldVehicleSnap.data();
                const newData = {
                    ...oldData,     // datos originales
                    ...update       // datos nuevos que sobreescriben a los originales
                };

                // Crear doc en la nueva ruta
                batch.set(newVehicleRef, newData);

                // Borrar doc en la ruta antigua
                batch.delete(oldVehicleRef);

                // ejecutar ambas operaciones en atómico
                await batch.commit();

            } else {
                // Actualización simple, del mismo ID
                await updateDoc(oldVehicleRef, update);
            }

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
