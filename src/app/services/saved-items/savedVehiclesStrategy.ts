import {inject, Injectable} from '@angular/core';
import {SavedItemsStrategy} from './savedItemsStrategy';
import {Auth} from '@angular/fire/auth';
import {VehicleService} from '../Vehicle/vehicle.service';
import {VehicleModel} from '../../data/VehicleModel';

@Injectable({providedIn: 'root'})
export class SavedVehiclesStrategy implements SavedItemsStrategy {
    private vehicleService = inject(VehicleService);

    async loadItems(auth: Auth): Promise<VehicleModel[]> {
        return await this.vehicleService.getVehicleList();
    }

    async toggleFavorite(auth: Auth, item: VehicleModel): Promise<boolean> {
        const res: boolean = await this.vehicleService.pinVehicle(item.matricula);
        if(res){
            item.pinned = !item.pinned;
        }
        return res;
    }

    getEmptyMessage(): string {
        return 'No tienes vehículos guardados. Registra uno y muévete con mayor facilidad.';
    }

    getDisplayName(item: VehicleModel): string {
        return item.alias || 'Vehículo sin nombre';
    }
}
