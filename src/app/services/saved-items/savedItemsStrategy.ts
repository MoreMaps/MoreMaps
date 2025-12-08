export interface SavedItemsStrategy<T = any> {
    // Carga los datos
    loadItems(): Promise<T[]>;

    // Maneja la acción de favorito (pin/unpin)
    toggleFavorite(item: T): Promise<boolean>;

    // Devuelve el mensaje a mostrar si la lista está vacía
    getEmptyMessage(): string;

    // Devuelve el alias, o nombre relevante en su defecto
    getDisplayName(item: T): string;
}
