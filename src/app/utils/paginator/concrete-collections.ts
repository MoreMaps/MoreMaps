import {IterableCollection, PagedIterator} from './iterator.interface';

export class ConcretePagedCollection<T> implements IterableCollection<T> {
    constructor(private items: T[], private itemsPerPage: number = 4) {}

    public createIterator(): PagedIterator<T> {
        return new ConcretePagedIterator<T>(this.items, this.itemsPerPage);
    }
}

export class ConcretePagedIterator<T> implements PagedIterator<T> {
    private position: number = 0; // Índice del primer elemento de la página actual
    private currentPage: number = 1;

    constructor(private collection: T[], private itemsPerPage: number) {}

    public getNext(): T[] {
        if (this.hasMore()) {
            this.position += this.itemsPerPage;
            this.currentPage++;
        }
        return this.paginatedItems();
    }

    public hasMore(): boolean {
        return this.position + this.itemsPerPage < this.collection.length;
    }

    public getPrevious(): T[] {
        if (this.hasPrevious()) {
            this.position -= this.itemsPerPage;
            this.currentPage--;
        }
        return this.paginatedItems();
    }

    public hasPrevious(): boolean {
        return this.position > 0;
    }

    public getCurrent(): T[] {
        return this.paginatedItems();
    }

    public getCurrentPageNumber(): number {
        return this.currentPage;
    }

    public getTotalPages(): number {
        return Math.ceil(this.collection.length / this.itemsPerPage) || 1;
    }

    /** Devuelve los elementos de cada página.
     * */
    private paginatedItems(): T[] {
        // Seguridad para no salir de límites
        const start = this.position;
        const end = Math.min(start + this.itemsPerPage, this.collection.length);
        return this.collection.slice(start, end);
    }

    /** Permite saltar a una posición si el usuario recarga página.
     * Rompe el patrón Iterator puro, pero es necesario para la persistencia en localStorage y solo se emplea en
     * ese supuesto.
     * */
    public jumpToPage(page: number): void {
        if (page < 1) page = 1;
        const total = this.getTotalPages();
        if (page > total) page = total;

        this.currentPage = page;
        this.position = (page - 1) * this.itemsPerPage;
    }
}
