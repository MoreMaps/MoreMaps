import {Injectable} from '@angular/core';
import {VehicleRepository} from './VehicleRepository';
import {Auth} from '@angular/fire/auth';
import {VehicleModel} from '../../data/VehicleModel';

@Injectable({
    providedIn: 'root'
})
export class VehicleDB implements VehicleRepository {
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
        return false;
    }

    async readVehicle(user: Auth, matricula: string): Promise<VehicleModel> {
        return new VehicleModel("", "21", "", "", 0, "", 0);
    }

    async pinVehicle(user: Auth, matricula: string): Promise<boolean> {
        return false;
    }
}
