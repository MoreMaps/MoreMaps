import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDialogModule} from '@angular/material/dialog';
import {Auth} from '@angular/fire/auth';
import {Subject} from 'rxjs';
import {POIModel} from '../../data/POIModel';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {NavbarComponent} from '../navbar/navbar.component';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {POIService} from '../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {Router} from '@angular/router';

type ItemType = 'lugares' | 'vehiculos' | 'rutas';

@Component({
    selector: 'app-saved-items',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        ThemeToggleComponent,
        NavbarComponent,
        ProfileButtonComponent
    ],
    templateUrl: './saved.html',
    styleUrls: ['./saved.scss'],
    providers: [POIService, {provide: POI_REPOSITORY, useClass: POIDB}]
})
export class SavedItemsComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private auth = inject(Auth);
    private poiService = inject(POIService);
    private router = inject(Router);

    items: POIModel[] = [];
    selectedItem: POIModel | null = null;
    selectedType: ItemType = 'lugares';

    // Paginación
    currentPage = 1;
    itemsPerPage = 4;
    totalPages = 1;

    // Responsive
    isMobile = false;

    async ngOnInit(): Promise<void> {
        await this.loadItems().catch(error => console.error('Error in ngOnInit:', error));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        window.removeEventListener('resize', () => this.checkViewport());
    }

    checkViewport(): void {
        // Breakpoint personalizado: 1024px para este diseño
        this.isMobile = window.innerWidth <= 1024;
    }

    async loadItems(): Promise<void> {
        try {
            // Llamada al servicio según el tipo seleccionado
            if (this.selectedType === 'lugares') {
                this.items = await this.poiService.getPOIList(this.auth);
                console.log(this.items);
            } else {
                // TODO: llamadas para vehículos y rutas
                // Por ahora, retornamos vacío para estos tipos
                this.items = [];
            }
            this.calculatePagination();
        } catch (error) {
            if (error instanceof SessionNotActiveError) this.router.navigate(['']);
            console.error('Error loading items:', error);
            this.items = [];
        }
    }

    selectType(type: ItemType): void {
        if (this.selectedType === type) return;

        this.selectedType = type;
        this.currentPage = 1;
        this.selectedItem = null;
        this.loadItems().catch(error => console.error('Error in selectType:', error));
    }

    selectItem(item: POIModel): void {
        this.selectedItem = item;
    }

    getDisplayName(item: POIModel): string {
        // Usar alias si existe y no está vacío, sino usar placeName
        return (item.alias && item.alias.trim() !== '') ? item.alias : item.placeName;
    }

    calculatePagination(): void {
        this.totalPages = Math.ceil(this.items.length / this.itemsPerPage);
        if (this.totalPages === 0) this.totalPages = 1;
    }

    get paginatedItems(): POIModel[] {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.items.slice(start, end);
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    getEmptyMessage(): string {
        switch (this.selectedType) {
            case 'lugares':
                return 'No tienes lugares guardados. Explora el mapa y guarda tus lugares favoritos.';
            case 'vehiculos':
                return 'No tienes vehículos guardados. Añade información sobre tus vehículos.';
            case 'rutas':
                return 'No tienes rutas guardadas. Crea y guarda tus rutas favoritas.';
            default:
                return 'No hay elementos guardados.';
        }
    }

    // TODO Favorites HU501
}
