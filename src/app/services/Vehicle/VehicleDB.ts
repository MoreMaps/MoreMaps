import {inject, Injectable} from '@angular/core';
import {VehicleRepository} from './VehicleRepository';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {ForbiddenContentError} from '../../errors/ForbiddenContentError';
import {doc, Firestore, getDoc, setDoc} from '@angular/fire/firestore';
import {DBAccessError} from '../../errors/DBAccessError';
import {VehicleAlreadyExistsError} from '../../errors/Vehicle/VehicleAlreadyExistsError';

@Injectable({
    providedIn: 'root'
})
export class VehicleDB implements VehicleRepository {

    private auth: Auth = inject(Auth);
    private firestore: Firestore = inject(Firestore);

    async createVehicle(user: Auth, vehiculo: VehicleModel): Promise<VehicleModel> {
        this.safetyChecks(user);
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
        } catch (e) {
            if (e instanceof VehicleAlreadyExistsError) throw e;

            // Error desconocido
            console.error('Error creando vehículo: ', e);
            throw new DBAccessError();
        }
    }

    async getVehicleList(user: Auth): Promise<VehicleModel[]> {
        return [];
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

    private safetyChecks(givenAuth: Auth) {
        const currentUser = this.auth.currentUser?.uid;
        const givenUser = givenAuth.currentUser?.uid;

        if (!currentUser || !givenUser) throw new SessionNotActiveError();
        if (currentUser !== givenUser) throw new ForbiddenContentError();
    }

    private properValues(vehiculo: Partial<VehicleModel>) {
        const year = vehiculo.anyo;
        const tipoCombustible = vehiculo.tipoCombustible;
        const consumoMedio = vehiculo.consumoMedio;
        const curYear = new Date().getFullYear();
        const minYear = 1900;
        const TIPO_COMBUSTIBLE_VALIDOS = ['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido (HEV)',
            'Híbrido Enchufable (PHEV)', 'GLP', 'GNC', 'Hidrógeno'];
        const MIN_CONSUMO_MEDIO = 0.1; // Consumo mínimo razonable (0.1 L/100km)

        if (typeof year !== 'number' || !Number.isInteger(year))
            throw new Error('El año del vehículo debe ser un número entero válido')
        // En la industria automotriz es común registrar vehículos a finales de año como del año siguiente
        if (year < minYear || year > curYear + 1)
            throw new Error(`El año debe estar entre ${minYear} y ${curYear + 1}`);

        if (typeof tipoCombustible !== 'string' || !TIPO_COMBUSTIBLE_VALIDOS.includes(tipoCombustible))
            throw new Error(`Tipo de combustible inválido. Tipos permitidos: ${TIPO_COMBUSTIBLE_VALIDOS}`)

        if (typeof consumoMedio !== 'number' || consumoMedio < MIN_CONSUMO_MEDIO)
            throw new Error (`El consumo medio debe ser un número positivo y mayor o igual que ${MIN_CONSUMO_MEDIO}`)
    }
}
