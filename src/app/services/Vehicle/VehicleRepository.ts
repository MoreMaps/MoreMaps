// por alguna razón pinPOI recibe el objeto entero en lugar del GeoHash, ¿enviamos aquí también el objeto vehículo entero?
import {VehicleModel} from '../../data/VehicleModel';
import {InjectionToken} from '@angular/core';
import {Auth} from '@angular/fire/auth';

export const VEHICLE_REPOSITORY = new InjectionToken<VehicleRepository>('VehicleRepository');

export interface VehicleRepository {
    // CRUDE
    createVehicle(user: Auth, vehiculo: VehicleModel) : Promise<VehicleModel>;
    getVehicleList(user: Auth) : Promise<VehicleModel[]>;
    updateVehicle(user: Auth, matricula: string, vehicle: Partial<VehicleModel>) : Promise<boolean>;
    deleteVehicle(user: Auth, matricula : string) : Promise<boolean>;
    readVehicle(user: Auth, matricula: string): Promise<VehicleModel>;
    pinVehicle(user: Auth, matricula: string) : Promise<boolean>;
}
