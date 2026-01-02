import {inject, Injectable} from '@angular/core';
import {SavedItemsStrategy} from './savedItemsStrategy';
import {RouteService} from '../Route/route.service';
import {RouteModel} from '../../data/RouteModel';

@Injectable({providedIn: 'root'})
export class SavedRouteStrategy implements SavedItemsStrategy {
    private routeService = inject(RouteService);

    async loadItems(): Promise<RouteModel[]> {
        return await this.routeService.getRouteList();
    }

    async toggleFavorite(item: RouteModel): Promise<boolean> {
        const res: boolean = await this.routeService.pinRoute(item);
        if(res){
            item.pinned = !item.pinned;
        }
        return res;
    }

    getEmptyMessage(): string {
        return 'No tienes rutas guardadas. Explora el mapa y guarda rutas para tenerlas siempre disponibles.';
    }

    getDisplayName(item: RouteModel): string {
        return item.alias || 'Ruta sin nombre';
    }
}
