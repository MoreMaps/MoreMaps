import {Auth} from '@angular/fire/auth';

export interface SavedItemsStrategy<T = any> {
    // Carga los datos
    loadItems(auth: Auth): Promise<T[]>;

    // Maneja la acción de favorito (pin/unpin)
    toggleFavorite(auth: Auth, item: T): Promise<boolean>;

    // Devuelve el mensaje a mostrar si la lista está vacía
    getEmptyMessage(): string;

    // Devuelve el alias, o nombre relevante en su defecto
    getDisplayName(item: T): string;
}
