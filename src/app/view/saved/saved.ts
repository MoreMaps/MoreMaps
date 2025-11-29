import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDialogModule} from '@angular/material/dialog';
import {Auth, authState} from '@angular/fire/auth';
import {Subject, take} from 'rxjs';
import {POIModel} from '../../data/POIModel';
import {ThemeToggleComponent} from '../themeToggle/themeToggle';
import {NavbarComponent} from '../navbar/navbar.component';
import {ProfileButtonComponent} from '../profileButton/profileButton';
import {POIService} from '../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../services/POI/POIRepository';
import {POIDB} from '../../services/POI/POIDB';
import {SessionNotActiveError} from '../../errors/SessionNotActiveError';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatProgressSpinner} from '@angular/material/progress-spinner';

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
        ProfileButtonComponent,
        NgOptimizedImage,
        MatProgressSpinner
    ],
    templateUrl: './saved.html',
    styleUrls: ['./saved.scss'],
    providers: [POIService, {provide: POI_REPOSITORY, useClass: POIDB}]
})
export class SavedItemsComponent implements OnInit, OnDestroy {
    loading = true;
    private destroy$ = new Subject<void>();
    private auth = inject(Auth);
    private poiService = inject(POIService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);

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
        authState(this.auth).pipe(take(1)).subscribe(user => {
            if (user) {
                this.loading = false;
                this.loadItems().catch(error => console.error('Error in ngOnInit:', error));
            } else {
                console.warn('Usuario no autenticado, redirigiendo...');
                this.router.navigate(['/']);
            }
        });
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
            if (error instanceof SessionNotActiveError) {
                this.router.navigate(['']);
                return;
            }
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

    // Poner los tipos VehicleModel y RouteModel cuando se vayan a implementar
    toggleFavorite(item: POIModel | any, event: Event): void {
        event.stopPropagation();
        switch (this.selectedType) {
            case 'lugares':
                this.togglePinned(item).catch(error => console.error('Error in toggleFavorite:', error));
                break;
            case 'vehiculos':
                console.log("No se ha implementado aún.");
                break;
            case 'rutas':
                console.log("No se ha implementado aún.");
                break;
            default:
                console.error('Tipo de item desconocido: ', this.selectedType);
                break;
        }
    }

    async togglePinned(item: POIModel): Promise<void> {
        const currentUser = this.auth.currentUser;
        console.log("El usuario no ha iniciado sesión: redirigiendo...")
        if (!currentUser) {
            this.router.navigate(['']);
            return;
        }
        let res = await this.poiService.pinPOI(this.auth, item);
        if (res) {
            await this.loadItems();
            this.showSnackbar(`${item.pinned ? 'Se ha fijado' : ''} POI "${this.getDisplayName(item)}"${!item.pinned ? ' ya no está fijado.' : '.'}`)
        }
    }

    private showSnackbar(msg: string): void {
        this.snackBar.open(msg, 'Ok', {
            duration: 5000,
            horizontalPosition: 'left',
            verticalPosition: 'bottom',
        });
    }
}
