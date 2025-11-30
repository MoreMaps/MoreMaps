import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {AddPoiDialogComponent, AddPoiMethod} from './add-poi-dialog/add-poi-dialog';
import {CoordsSearchDialogComponent} from './coords-search-dialog/coords-search-dialog';
import { MapUpdateService } from '../../services/map-update-service/map-updater'; // Asegura la ruta correcta

@Component({
    selector: 'app-navbar',
    imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatDialogModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css'
})
export class NavbarComponent {
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private mapUpdateService = inject(MapUpdateService);

    isActive(route: string): boolean {
        return this.router.url === route;
    }

    navigateTo(route: string): void {
        this.router.navigate([route]);
    }

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

    openPlaceNameDialog(): void {
        // todo en hu202
    }

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
                // Se navega al mapa en caso de no estar ahí
                if (this.router.url !== '/map') {
                    this.navigateTo('/map');
                }

                // Se envían las coordenadas al servicio
                this.mapUpdateService.triggerCoordinateSearch(result.lat, result.lon);
            }
        });
    }
}
