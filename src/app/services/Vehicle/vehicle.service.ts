import {inject, Injectable} from '@angular/core';
import {VEHICLE_REPOSITORY, VehicleRepository} from './VehicleRepository';
import {VehicleModel} from '../../data/VehicleModel';


@Injectable({ providedIn: 'root' })
export class VehicleService {
    private vehicleDb: VehicleRepository = inject(VEHICLE_REPOSITORY);

    // HU301 Crear vehículo
    async createVehicle(vehicle: VehicleModel): Promise<VehicleModel> {
        return this.vehicleDb.createVehicle(vehicle);
    }

    // HU302 Consultar lista de vehículos
    async getVehicleList(): Promise<VehicleModel[]> {
        let vehicleList: VehicleModel[] = await this.vehicleDb.getVehicleList();
        if (vehicleList.length > 0) {
            vehicleList.sort((a, b) => {
                // 1. Primero ordenar por pinned (true > false)
                if (a.pinned !== b.pinned){
                    return a.pinned ? -1 : 1;
                }
                // 2. Luego ordenar alfabéticamente por alias o placeName
                return a.alias.localeCompare(b.alias, 'es', {sensitivity: 'base'});
            });
            return vehicleList;
        }

        return [];
    }

    // HU303 Modificar información de un vehículo
    async updateVehicle(matricula: string, update: Partial<VehicleModel>): Promise<boolean> {
        return this.vehicleDb.updateVehicle(matricula, update);
    }

    // HU304 Eliminar vehículo
    async deleteVehicle(matricula: string): Promise<boolean> {
        return this.vehicleDb.deleteVehicle(matricula);
    }

    // HU305 Consultar vehículo
    async readVehicle(matricula: string): Promise<VehicleModel> {
        return new VehicleModel("", "21", "", "", 0, "", 0); // Matrícula 21 en vez de 12 para evitar problemas de comparación con create
    }

    // HU502 Fijar vehículo
    async pinVehicle(matricula: string): Promise<boolean> {
        return false;
    }
}
