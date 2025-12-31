import {inject, Injectable} from '@angular/core';
import {VehicleRepository} from './VehicleRepository';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {DBAccessError} from '../../errors/DBAccessError';
import {
    collection,
    deleteDoc,
    doc,
    Firestore,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    writeBatch
} from '@angular/fire/firestore';


@Injectable({
    providedIn: 'root'
})
export class VehicleDB implements VehicleRepository {
    private firestore = inject(Firestore);
    private auth = inject(Auth);

    /**
     * Registra un vehículo en la base de datos.
     * @param vehiculo datos del vehículo: (alias, matrícula, marca, modelo, año, tipoCombustible, consumoMedio, fijado)
     */
    async createVehicle(vehiculo: VehicleModel): Promise<VehicleModel> {
        try {
            // Referencia al documento
            const vehicleDocRef = doc(this.firestore, `items/${this.auth.currentUser?.uid}/vehicles/${vehiculo.matricula}`);

            // Crear nuevo vehículo
            await setDoc(vehicleDocRef, vehiculo.toJSON());
            return vehiculo;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Devuelve la lista de vehículos registrados del usuario.
     */
    async getVehicleList(): Promise<VehicleModel[]> {
        const path: string = `/items/${this.auth.currentUser!.uid}/vehicles`;
        try {
            // Obtener items de la colección
            const itemsRef = collection(this.firestore, path);
            const snapshot = await getDocs(query(itemsRef));

            // Mapear a lista de VehicleModel
            let list: VehicleModel[] = [];
            if (!snapshot.empty) {
                list = snapshot.docs.map(doc => {
                    return VehicleModel.fromJSON(doc.data());
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
     * Actualiza los datos de la base de datos correspondientes al vehículo con la matrícula especificada.
     * @param matricula Matrícula del vehículo
     * @param update Partial con los atributos a actualizar
     */
    async updateVehicle(matricula: string, update: Partial<VehicleModel>): Promise<boolean> {
        try {
            // Obtener los datos del vehículo que se va a actualizar
            const oldVehicleRef = doc(this.firestore, `/items/${this.auth.currentUser?.uid}/vehicles/${matricula}`);
            const oldVehicleSnap = await getDoc(oldVehicleRef);

            // Detectar si estamos cambiando la matrícula (ID del doc.)
            const newMatricula = update.matricula;
            const isRenaming = newMatricula && newMatricula !== matricula;

            if (isRenaming) {
                const newVehicleRef = doc(this.firestore, `/items/${this.auth.currentUser?.uid}/vehicles/${newMatricula}`);

                // lote atómico
                const batch = writeBatch(this.firestore);
                const oldData = oldVehicleSnap.data();
                const newData = {
                    ...oldData,     // datos originales
                    ...update       // datos nuevos que sobreescriben a los originales
                };

                console.log(newData)

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
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Elimina los datos de la base de datos correspondientes al vehículo con la matrícula especificada.
     * @param matricula matricula del vehículo
     */
    async deleteVehicle(matricula: string): Promise<boolean> {
        try {
            // Obtener los datos del vehículo que se va a borrar
            const vehicleRef = doc(this.firestore, `items/${this.auth.currentUser?.uid}/vehicles/${matricula}`);

            // Borrar documento
            // TODO: PROPAGAR A RUTAS
            await deleteDoc(vehicleRef);
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Borra todos los vehículos del usuario actual de forma atómica.
     */
    async clear(): Promise<boolean> {
        const pois = await getDocs(query(collection(this.firestore, `items/${this.auth.currentUser?.uid}/vehicles`)));

        try {
            // Transacción
            const batch = writeBatch(this.firestore);
            pois.forEach(route => {
                batch.delete(route.ref);
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
     * Lee los datos de la base de datos correspondientes al vehículo con la matrícula especificada.
     * @param matricula matricula del vehículo
     */
    async readVehicle(matricula: string): Promise<VehicleModel> {
        const path: string = `items/${this.auth.currentUser?.uid}/vehicles/${matricula}`;

        // Obtener datos de Firebase
        try {
            const vehicleSnap = await getDoc(doc(this.firestore, path));

            // Devolver vehículo
            return VehicleModel.fromJSON(vehicleSnap.data());
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Fija el vehículo si no está fijado y viceversa.
     * @param matricula matrícula del vehículo
     */
    async pinVehicle(matricula: string): Promise<boolean> {
        // Lectura del vehículo registrado.
        const vehicle: VehicleModel = await this.readVehicle(matricula);

        // Ruta para actualizar el vehículo
        const path: string = `/items/${this.auth.currentUser!.uid}/vehicles/${matricula}`;

        // Actualización del documento, invirtiendo "pinned".
        try {
            await updateDoc( doc(this.firestore, path), {pinned: !vehicle.pinned} );
            return true;
        }
        catch (error: any) {
            // Ha ocurrido un error inesperado en Firebase
            console.error('Error al obtener respuesta de Firebase: ' + error);
            throw new DBAccessError();
        }
    }

    /**
     * Recibe una matrícula y comprueba si existe un vehículo en Firestore que la utilice
     * @param matricula Matrícula de un vehículo
     * @returns Promise con true si existe, false si no existe
     */
    async vehicleExists(matricula: string): Promise<boolean> {
        const path = `items/${this.auth.currentUser?.uid}/vehicles/${matricula}`;
        const docRef = doc(this.firestore, path);
        const snap = await getDoc(docRef);
        return snap.exists();
    }
}
