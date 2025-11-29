import {Injectable} from '@angular/core';
import {SavedItemsStrategy} from './savedItemsStrategy';
import {Auth} from '@angular/fire/auth';

// Por ahora, este es únicamente un placeholder.
@Injectable({providedIn: 'root'})
export class SavedVehiclesStrategy implements SavedItemsStrategy {
    async loadItems(auth: Auth): Promise<any[]> {
        return [];
    }

    async toggleFavorite(auth: Auth, item: any): Promise<boolean> {
        return false;
    }

    getEmptyMessage(): string {
        return 'Esta función no está implementada y es un placeholder por el momento.';
    }

    getDisplayName(item: any): string {
        return item.name || 'Vehículo sin nombre';
    }
}
