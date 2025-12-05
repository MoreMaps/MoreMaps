// por alguna razón pinPOI recibe el objeto entero en lugar del GeoHash, ¿enviamos aquí también el objeto vehículo entero?
import {VehicleModel} from '../../data/VehicleModel';
import {InjectionToken} from '@angular/core';

export const VEHICLE_REPOSITORY = new InjectionToken<VehicleRepository>('VehicleRepository');

export interface VehicleRepository {
    // CRUDE
    createVehicle(vehiculo: VehicleModel) : Promise<VehicleModel>;
    getVehicleList() : Promise<VehicleModel[]>;
    updateVehicle(matricula: string, vehicle: Partial<VehicleModel>) : Promise<boolean>;
    deleteVehicle(matricula : string) : Promise<boolean>;
    readVehicle(matricula: string): Promise<VehicleModel>;
    pinVehicle(matricula: string) : Promise<boolean>;
}
