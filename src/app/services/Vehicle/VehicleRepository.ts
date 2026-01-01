import {VehicleModel} from '../../data/VehicleModel';
import {InjectionToken} from '@angular/core';

export const VEHICLE_REPOSITORY = new InjectionToken<VehicleRepository>('VehicleRepository');

export interface VehicleRepository {
    // Operaciones CRUDE
    createVehicle(vehiculo: VehicleModel) : Promise<VehicleModel>;
    getVehicleList() : Promise<VehicleModel[]>;
    updateVehicle(matricula: string, vehicle: Partial<VehicleModel>) : Promise<boolean>;
    deleteVehicle(matricula : string) : Promise<boolean>;
    getVehicle(matricula: string): Promise<VehicleModel>;

    // Borra todos los vehículos
    clear(): Promise<boolean>;

    // Fijar vehículo
    pinVehicle(matricula: string) : Promise<boolean>;

    // Métodos auxiliares
    vehicleExists(matricula: string): Promise<boolean>;
}
