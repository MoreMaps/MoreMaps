import {inject, Injectable} from '@angular/core';
import {VEHICLE_REPOSITORY, VehicleRepository} from './VehicleRepository';
import {VehicleModel} from '../../data/VehicleModel';
import {Auth} from '@angular/fire/auth';


@Injectable({ providedIn: 'root' })
export class VehicleService {
    private vehicleDb: VehicleRepository = inject(VEHICLE_REPOSITORY);

    // HU301 Crear vehículo
    async createVehicle(auth: Auth, vehicle: VehicleModel): Promise<VehicleModel> {
        return new VehicleModel("", "12", "", "", 0, "", 0); // matricula no vacía para evitar problemas
    }

    // HU302 Consultar lista de vehículos
    async getVehicleList(user: Auth): Promise<VehicleModel[]> {
        return [];
    }

    // HU303 Modificar información de un vehículo
    async updateVehicle(user: Auth, matricula: string, update: Partial<VehicleModel>): Promise<boolean> {
        return this.vehicleDb.updateVehicle(user, matricula, update);
    }

    // HU304 Eliminar vehículo
    async deleteVehicle(user: Auth, matricula: string): Promise<boolean> {
        return false;
    }

    // HU305 Consultar vehículo
    async readVehicle(user: Auth, matricula: string): Promise<VehicleModel> {
        return new VehicleModel("", "21", "", "", 0, "", 0); // Matrícula 21 en vez de 12 para evitar problemas de comparación con create
    }

    // HU502 Fijar vehículo
    async pinVehicle(user: Auth, matricula: string): Promise<boolean> {
        return false;
    }
}
