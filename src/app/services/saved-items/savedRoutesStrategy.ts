import {Injectable} from '@angular/core';
import {SavedItemsStrategy} from './savedItemsStrategy';

@Injectable({providedIn: 'root'})
export class SavedRouteStrategy implements SavedItemsStrategy {
    async loadItems(): Promise<any[]> {
        return [];
    }

    async toggleFavorite(item: any): Promise<boolean> {
        return false;
    }

    getEmptyMessage(): string {
        return 'Esta función no está implementada y es un placeholder por el momento.';
    }

    getDisplayName(item: any): string {
        return item.name || 'Ruta sin nombre';
    }
}
