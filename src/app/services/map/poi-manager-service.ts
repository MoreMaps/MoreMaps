import {inject, Injectable, signal} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import {Router} from '@angular/router';

// Modelos y Datos
import {POISearchModel} from '../../data/POISearchModel';
import {Geohash, geohashForLocation} from 'geofire-common';
import {CoordsNotFoundError} from '../../errors/POI/CoordsNotFoundError';

// Servicios de Capas y Lógica
import {MapSearchService} from './map-search-service/map-search.service';
import {POIService} from '../POI/poi.service';
import {MapCoreService} from './map-core-service';
import {MarkerLayerService} from './marker-layer-service';
import {RouteLayerService} from './route-layer-service';

// Componentes UI
import {PoiDetailsDialog} from '../../view/map/poi-details-dialog/poi-details-dialog';

import {SpinnerSnackComponent} from '../../utils/map-widgets';

@Injectable({
    providedIn: 'root'
})
export class PoiManagerService {
    // --- INYECCIONES ---
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private mapSearchService = inject(MapSearchService);
    private poiService = inject(POIService);
    private mapCoreService = inject(MapCoreService);
    private markerLayerService = inject(MarkerLayerService);
    private routeLayerService = inject(RouteLayerService);

    // --- ESTADO ---
    private listPOIs = signal<POISearchModel[]>([]);
    private currentPOI = signal<POISearchModel | null>(null);
    private currentIndex = signal<number>(-1);
    private savedPOIs: Geohash[] = [];

    private poiDialogRef: MatDialogRef<PoiDetailsDialog> | null = null;
    private loadingSnackBarRef: MatSnackBarRef<any> | null = null;

    constructor() {
        // Carga inicial de favoritos para pintar las estrellas correctamente
        this.refreshSavedList().then();
    }

    // --- BÚSQUEDA Y SELECCIÓN ---

    async searchByCoords(lat: number, lon: number): Promise<void> {
        if (this.routeLayerService.hasActiveRoute()) {
            this.showSimpleSnack('Cierra la ruta actual para buscar puntos.');
            return;
        }

        this.showLoadingSnack();

        try {
            const result = await this.mapSearchService.searchPOIByCoords(lat, lon);
            this.selectPOI(result);
        } catch (error: any) {
            this.handleError(error, lat, lon);
        } finally {
            this.dismissLoadingSnack();
        }
    }

    async searchByPlaceName(query: string): Promise<void> {
        if (this.routeLayerService.hasActiveRoute()) {
            this.showSimpleSnack('Cierra la ruta actual para buscar puntos.');
            return;
        }

        this.showLoadingSnack();

        try {
            const results = await this.mapSearchService.searchPOIByPlaceName(query);
            this.selectPOI(results);
        } catch (error: any) {
            this.showSimpleSnack(`Error al buscar: ${error.message || error}`);
        } finally {
            this.dismissLoadingSnack();
        }
    }

    /**
     * Punto de entrada principal para mostrar POIs.
     * Recibe 1 o N resultados, pinta marcadores y abre diálogo.
     */
    selectPOI(poi: POISearchModel | POISearchModel[]): void {
        this.closePOIDetailsDialog(); // Limpieza previa

        const newData = Array.isArray(poi) ? poi : [poi];
        if (newData.length === 0) return;

        // Actualizar Estado
        this.listPOIs.set(newData);
        this.currentIndex.set(0);
        this.currentPOI.set(newData[0]);

        // 1. Pintar Marcadores (Delegar a MarkerLayer)
        this.markerLayerService.renderMarkers(newData);

        // 2. Resaltar el primero
        this.markerLayerService.highlightMarker(0);

        // 3. Abrir UI
        this.openPOIDetailsDialog();
    }

    // --- NAVEGACIÓN ENTRE RESULTADOS ---

    nextPOI(): void {
        const total = this.listPOIs().length;
        if (total <= 1) return;
        const newIndex = (this.currentIndex() + 1) % total;
        this.goToIndex(newIndex);
    }

    previousPOI(): void {
        const total = this.listPOIs().length;
        if (total <= 1) return;
        const newIndex = (this.currentIndex() - 1 + total) % total;
        this.goToIndex(newIndex);
    }

    private goToIndex(index: number): void {
        const list = this.listPOIs();
        if (!list.length) return;

        const nextPoi = list[index];
        this.currentIndex.set(index);
        this.currentPOI.set(nextPoi);

        // Sincronizar UI
        if (this.poiDialogRef?.componentInstance) {
            this.poiDialogRef.componentInstance.updatePOI(nextPoi, index, this.savedPOIs);
        }

        // Sincronizar Mapa
        this.markerLayerService.highlightMarker(index);
        this.mapCoreService.panTo(nextPoi.lat, nextPoi.lon);
    }

    // --- GESTIÓN DE DIÁLOGOS ---

    private openPOIDetailsDialog(): void {
        this.poiDialogRef = this.dialog.open(PoiDetailsDialog, {
            position: {bottom: '20px', left: '20px'},
            width: '50vw', maxWidth: '500px',
            height: 'auto', maxHeight: '15vh',
            hasBackdrop: false, disableClose: true,
            data: {
                currentPOI: this.currentPOI(),
                totalPOIs: this.listPOIs().length,
                currentIndex: this.currentIndex(),
                savedPOIs: this.savedPOIs,
            },
        });

        const instance = this.poiDialogRef.componentInstance;

        // Suscripciones a eventos del diálogo
        instance.next.subscribe(() => this.nextPOI());
        instance.prev.subscribe(() => this.previousPOI());
        instance.center.subscribe(() => {
            const p = this.currentPOI();
            if (p) this.mapCoreService.flyTo(p.lat, p.lon);
        });
        instance.save.subscribe(() => this.saveCurrentPOI());

        this.poiDialogRef.afterClosed().subscribe(result => {
            if (!result?.savePOI && !result?.ignore) {
                this.clearSession(); // Si cierran con la X, limpiamos
            }
        });
    }

    closePOIDetailsDialog(): void {
        if (this.poiDialogRef) {
            this.poiDialogRef.close({ignore: true}); // ignore evita lanzar clearSession dos veces
            this.poiDialogRef = null;
        }
    }

    // --- PERSISTENCIA Y LIMPIEZA ---

    private async saveCurrentPOI() {
        const poi = this.currentPOI();
        if (!poi) return;

        this.closePOIDetailsDialog(); // Cerramos visualmente primero

        try {
            await this.poiService.createPOI(poi);
            await this.refreshSavedList();

            const geohash = geohashForLocation([poi.lat, poi.lon], 7);
            this.showActionSnackBar('Punto guardado correctamente.', 'Ver', geohash);

            this.clearSession(); // Limpiamos mapa tras guardar
        } catch (e) {
            this.showSimpleSnack('Error al guardar el punto.');
        }
    }

    clearSession(navigate: boolean = true): void {
        this.markerLayerService.clearMarkers();
        this.listPOIs.set([]);
        this.currentPOI.set(null);
        this.closePOIDetailsDialog();

        if (navigate) {
            void this.router.navigate([], {
                queryParams: {},
                replaceUrl: true
            });
        }
    }

    public async refreshSavedList() {
        const list = await this.poiService.getPOIList();
        this.savedPOIs = list.map(item => item.geohash);
    }

    // --- HELPERS ---

    private showLoadingSnack() {
        this.loadingSnackBarRef = this.snackBar.openFromComponent(SpinnerSnackComponent, {
            horizontalPosition: 'left', verticalPosition: 'bottom', duration: 0
        });
    }

    private dismissLoadingSnack() {
        this.loadingSnackBarRef?.dismiss();
        this.loadingSnackBarRef = null;
    }

    private showSimpleSnack(msg: string) {
        this.snackBar.open(msg, 'Cerrar', {duration: 3000});
    }

    private showActionSnackBar(msg: string, action: string, geohash: string) {
        const snackBarRef =
            this.snackBar.open(msg, action, {
                duration: 5000,
                horizontalPosition: 'left',
                verticalPosition: 'bottom'
            });
        snackBarRef.onAction().subscribe(() => {
            void this.router.navigate(['/saved'], {
                queryParams: {
                    type: 'lugares',
                    id: geohash,
                }
            });
        });
    }

    private handleError(error: any, lat: number, lon: number) {
        if (error instanceof CoordsNotFoundError) {
            this.showSimpleSnack(`No hay dirección en (${lat}, ${lon}).`);
        } else {
            this.showSimpleSnack(`Error: ${error.message || 'Desconocido'}`);
        }
    }
}
