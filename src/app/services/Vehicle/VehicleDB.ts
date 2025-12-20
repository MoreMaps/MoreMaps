import {inject, Injectable} from '@angular/core';
import {VehicleRepository} from './VehicleRepository';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {SessionNotActiveError} from '../../errors/User/SessionNotActiveError';
import {VehicleAlreadyExistsError} from '../../errors/Vehicle/VehicleAlreadyExistsError';
import {MissingVehicleError} from '../../errors/Vehicle/MissingVehicleError';
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
     * @param vehiculo datos del vehículo: (alias, matricula, marca, modelo, anyo,
     * tipoCombustible, consumoMedio, fijado)
     */
    async createVehicle(vehiculo: VehicleModel): Promise<VehicleModel> {
        this.safetyChecks();
        this.properValues(vehiculo);

        try {
            const userUid = this.auth.currentUser!.uid;

            // Referencia al documento
            const vehicleDocRef = doc(this.firestore, `items/${userUid}/vehicles/${vehiculo.matricula}`);

            // Obtener el snapshot para ver si existe
            const docSnap = await getDoc(vehicleDocRef);

            // Si existe, lanzamos el error
            if (docSnap.exists()) throw new VehicleAlreadyExistsError();

            // Si no existe, procedemos a guardar
            if (vehiculo) await setDoc(vehicleDocRef, vehiculo.toJSON());
            return vehiculo;
        } catch (error) {
            if (error instanceof VehicleAlreadyExistsError) throw error;

            // Error desconocido
            console.error('Error creando vehículo: ', error);
            throw new DBAccessError(error as string);
        }
    }

    /**
     * Lee los datos de la base de datos correspondientes al vehículo con la matrícula especificada.
     */
    async getVehicleList(): Promise<VehicleModel[]> {
        this.safetyChecks();

        let list: VehicleModel[] = [];
        const path: string = `/items/${this.auth.currentUser!.uid}/vehicles`;

        try{
            // Obtener items de la colección
            const itemsRef = collection(this.firestore, path);
            const snapshot = await getDocs(query(itemsRef));

            if (!snapshot.empty) {
                list = snapshot.docs.map(doc => {
                    return VehicleModel.fromJSON(doc.data());
                });
            }
        } catch(error) {
            console.error("ERROR de Firebase: " + error);
            throw new DBAccessError(error as string);
        }

        return list;
    }

    /**
     * Actualiza los datos de la base de datos correspondientes al vehículo con la matrícula especificada.
     * @param matricula matricula del vehículo
     */
    async updateVehicle(matricula: string, update: Partial<VehicleModel>): Promise<boolean> {
        this.safetyChecks();
        this.properValues(update, false);

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

    /**
     * Elimina los datos de la base de datos correspondientes al vehículo con la matrícula especificada.
     * @param matricula matricula del vehículo
     */
    async deleteVehicle(matricula: string): Promise<boolean> {
        this.safetyChecks();
        try {
            // Obtener los datos del vehículo que se va a borrar
            const vehicleRef = doc(this.firestore, `items/${this.auth.currentUser?.uid}/vehicles/${matricula}`);
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

    /**
     * Lee los datos de la base de datos correspondientes al vehículo con la matrícula especificada.
     * @param matricula matricula del vehículo
     */
    async readVehicle(matricula: string): Promise<VehicleModel> {
        this.safetyChecks();
        const path: string = `items/${this.auth.currentUser?.uid}/vehicles/${matricula}`;
        let vehicleSnap;

        // Obtener datos de Firebase
        try {
            vehicleSnap = await getDoc( doc(this.firestore, path) );
        } catch (error: any) {
            // Loguear error de Firebase
            console.error("ERROR de Firebase: " + error);
            throw new DBAccessError(error);
        }

        // Si no se han podido obtener, el vehículo solicitado no existe.
        if (!vehicleSnap.exists()) {
            throw new MissingVehicleError();
        }

        // Devolver vehículo
        return VehicleModel.fromJSON(vehicleSnap.data());
    }

    /**
     * Fija el vehículo si no está fijado y viceversa.
     * @param matricula matrícula del vehículo
     */
    async pinVehicle(matricula: string): Promise<boolean> {
        this.safetyChecks();

        // Lectura del vehículo registrado.
        const vehicle: VehicleModel = await this.readVehicle(matricula);

        // Ruta para actualizar el vehículo
        const path: string = `/items/${this.auth.currentUser!.uid}/vehicles/${matricula}`;

        // Actualización del documento, invirtiendo "pinned".
        try {
            await updateDoc( doc(this.firestore, path), {pinned: !vehicle.pinned} );
            return true;
        } catch (error: any) {
            console.error(`Error al intentar fijar vehículo con matrícula ${matricula}: ${error}`);
            switch (error.code) {
                case 'invalid-argument':
                case 'not-found':
                    throw new MissingVehicleError();
            }
            throw new DBAccessError(error);
        }
    }

    /**
     * Comprobación de sesión activa.
     * @private
     */
    private safetyChecks() {
        const currentUser = this.auth.currentUser?.uid;
        if (!currentUser) throw new SessionNotActiveError();
    }

    private properValues(vehiculo: Partial<VehicleModel>, strictMode: boolean = true) {
        const year = vehiculo.anyo;
        const tipoCombustible = vehiculo.tipoCombustible;
        const consumoMedio = vehiculo.consumoMedio;
        const curYear = new Date().getFullYear();
        const minYear = 1900;
        const TIPO_COMBUSTIBLE_VALIDOS = ['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido (HEV)',
            'Híbrido Enchufable (PHEV)', 'GLP', 'GNC', 'Hidrógeno'];
        const MIN_CONSUMO_MEDIO = 0.1; // Consumo mínimo razonable (0.1 L/100km)

        if (strictMode && (typeof year !== 'number' || !Number.isInteger(year)))
            throw new Error('El año del vehículo debe ser un número entero válido')
        // En la industria automotriz es común registrar vehículos a finales de año como del año siguiente
        if (year) {
            if (year < minYear || year > curYear + 1)
                throw new Error(`El año debe estar entre ${minYear} y ${curYear + 1}`);
        }
        if (strictMode && typeof tipoCombustible !== 'string')
            throw new Error(`El campo de combustible es obligatorio`)
        if (tipoCombustible)
            if (!TIPO_COMBUSTIBLE_VALIDOS.includes(tipoCombustible))
                throw new Error(`Tipo de combustible "${tipoCombustible}" inválido.`)

        if (strictMode && typeof consumoMedio !== 'number')
            throw new Error(`El campo de consumo medio es obligatorio y debe ser un número positivo y mayor o igual que ${MIN_CONSUMO_MEDIO}`)
        if (consumoMedio)
            if (consumoMedio < MIN_CONSUMO_MEDIO)
                throw new Error(`El consumo medio debe ser un número positivo y mayor o igual que ${MIN_CONSUMO_MEDIO}`)
    }
}
