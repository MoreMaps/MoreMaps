export interface Iterator<T> {
    getNext(): T;
    hasMore(): boolean;
}

// Paginador para UI
export interface PagedIterator<T> extends Iterator<T[]> {
    // Estándar
    getNext(): T[];
    hasMore(): boolean;

    // Requisito de la UI
    getPrevious(): T[];
    hasPrevious(): boolean;

    // Estado actual
    getCurrent(): T[];
    getCurrentPageNumber(): number;
    getTotalPages(): number;
}

export interface IterableCollection<T> {
    createIterator(): PagedIterator<T>;
}
