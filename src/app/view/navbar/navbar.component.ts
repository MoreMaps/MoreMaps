import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {AddPoiDialogComponent, AddPoiMethod} from './add-poi-dialog/add-poi-dialog';
import {CoordsSearchDialogComponent} from './coords-search-dialog/coords-search-dialog';
import {MapUpdateService} from '../../services/map-update-service/map-updater';
import {PlaceNameSearchDialogComponent} from './placename-search-dialog/placename-search-dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar'; // Asegura la ruta correcta

@Component({
    selector: 'app-navbar',
    imports: [
        CommonModule,
        RouterModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatMenuModule,
        MatSnackBarModule,
    ],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css'
})
export class NavbarComponent {
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private mapUpdateService = inject(MapUpdateService);
    private snackBar = inject(MatSnackBar);

    isActive(route: string): boolean {
        return this.router.url.split(/[?#]/)[0] === route;
    }

    navigateTo(route: string): void {
        this.router.navigate([route]);
    }

    // --- Funciones del menú ---

    // 1. Búsqueda de POI
    openAddDialog(): void {
        // Abrir el diálogo
        const dialogRef = this.dialog.open(AddPoiDialogComponent, {
            width: '90%',
            maxWidth: '400px',
            disableClose: false,
            autoFocus: true,
            restoreFocus: true,
            enterAnimationDuration: '300ms',
            exitAnimationDuration: '200ms',
        });

        // Manejar la respuesta
        dialogRef.afterClosed().subscribe((result: AddPoiMethod) => {
            if (result === 'coords') {
                this.openCoordsDialog();
            } else if (result === 'name') {
                this.openPlaceNameDialog();
            }
        });
    }

    // 2. Búsqueda de rutas
    openRouteSearch(): void {
        this.snackBar.open('Función no implementada', 'OK', {
            duration: 3000,
            horizontalPosition: 'left',
            verticalPosition: 'bottom'
        });
    }

    // --- Funciones de búsqueda de POI ---

    // 1a. Búsqueda por coordenadas
    openCoordsDialog(): void {
        const coordsDialogRef = this.dialog.open(CoordsSearchDialogComponent, {
            width: '90%',
            maxWidth: '400px',
            disableClose: false,
            autoFocus: true,
            restoreFocus: true,
            enterAnimationDuration: '300ms',
            exitAnimationDuration: '200ms',
        });

        coordsDialogRef.afterClosed().subscribe((result: { lat: number, lon: number } | null) => {
            if (result) {
                this.router.navigate(['/map'], {queryParams: {lat: result.lat, lon: result.lon}});
            }
        });
    }

    // 1b. Búsqueda por topónimo
    openPlaceNameDialog(): void {
        const placeNameDialogRef = this.dialog.open(PlaceNameSearchDialogComponent, {
            width: '90%',
            maxWidth: '400px',
            disableClose: false,
            autoFocus: true,
            restoreFocus: true,
            enterAnimationDuration: '300ms',
            exitAnimationDuration: '200ms',
        });

        placeNameDialogRef.afterClosed().subscribe((placeName: string | null) => {
            if (placeName) {
                this.router.navigate(['/map'], {queryParams: {name: placeName}});
            }
        });
    }
}
