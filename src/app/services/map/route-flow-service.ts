import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {firstValueFrom} from 'rxjs';
import {geohashForLocation} from 'geofire-common';

// Componentes
import {RouteOriginDialog, RouteOriginMethod} from '../../view/route/route-origin-dialog/route-origin-dialog';
import {AddPoiDialogComponent, AddPoiMethod} from '../../view/navbar/add-poi-dialog/add-poi-dialog';
import {SavedItemSelector} from '../saved-items/saved-item-selector-dialog/savedSelectorData';
import {CoordsSearchDialogComponent} from '../../view/navbar/coords-search-dialog/coords-search-dialog';
import {PlaceNameSearchDialogComponent} from '../../view/navbar/placename-search-dialog/placename-search-dialog';
import {PointConfirmationDialog} from '../../view/navbar/point-confirmation-dialog/point-confirmation-dialog';
import {RouteOptionsDialogComponent} from '../../view/route/route-options-dialog/route-options-dialog';

// Modelos y Servicios necesarios para la búsqueda interna del flujo
import {MapSearchService} from './map-search-service/map-search.service';
import {POISearchModel} from '../../data/POISearchModel';
import {
    FlowPoint,
    FlowState,
    IRouteFlowService,
    RouteFlowConfig,
    RouteFlowContext,
    RouteFlowData
} from './route-flow-state';
import {OriginState} from './route-flow-steps';
import {PreferenceService} from '../Preferences/preference.service';
import {PreferenceModel} from '../../data/PreferenceModel';
import {TIPO_TRANSPORTE} from '../../data/RouteModel';


@Injectable({
    providedIn: 'root'
})
export class RouteFlowService implements IRouteFlowService {
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private mapSearchService = inject(MapSearchService);
    private preferenceService = inject(PreferenceService);

    /**
     * Orquesta el flujo completo para obtener un punto (Origen o Destino).
     * 1) ¿Es el punto uno guardado, o quieres buscar uno nuevo?
     * 2) En caso de ser uno nuevo, ¿qué tipo de búsqueda es (topónimo / coordenadas)?
     * 3) Confirmar el resultado
     */
    public async getPointFromUser(
        title: string,
        subtitle: string,
        currentStep: number,
        totalSteps: number,
        showBack: boolean
    ): Promise<FlowPoint | 'BACK' | null> {
        while (true) {
            // 1. Abrir diálogo inicial: "¿Guardado o Buscar?"
            const dialogRef = this.dialog.open(RouteOriginDialog, {
                width: '90%', maxWidth: '400px',
                data: {title, subtitle, currentStep, totalSteps, showBack}
            });

            const originMethod = await firstValueFrom(dialogRef.afterClosed()) as RouteOriginMethod;

            if (originMethod === 'BACK') return 'BACK';
            if (!originMethod) return null;

            // CASO A: Guardados
            if (originMethod === 'saved') {
                const savedPoi = await this.selectSavedItem('lugares', 'Mis lugares guardados');

                if (savedPoi === 'BACK') return 'BACK';
                if (savedPoi) {
                    return {
                        hash: savedPoi.geohash,
                        name: savedPoi.alias || savedPoi.placeName,
                        lat: savedPoi.lat,
                        lon: savedPoi.lon
                    };
                }
                continue; // Si cancela la selección de guardados, volvemos al paso 1
            }

            // CASO B: Búsqueda
            const searchMethod = await this.askForSearchMethod();
            if (!searchMethod) continue;

            const search = await this.executeSearchMethod(searchMethod, true);
            if (search === 'BACK') continue;

            if (search) {
                const finalLat = search.lat;
                const finalLon = search.lon;
                // Calculamos hash si no venía incluido
                const hash = (finalLat && finalLon) ? geohashForLocation([finalLat, finalLon], 7) : undefined;

                return {
                    lat: finalLat,
                    lon: finalLon,
                    name: search.name,
                    hash: hash
                };
            }
        }
    }

    /**
     * Abre un selector genérico de ítems guardados (Lugares, Vehículos, Resultados).
     */
    public async selectSavedItem(
        type: 'lugares' | 'vehiculos' | 'search-results',
        title?: string,
        showBack: boolean = false,
        items?: any[]
    ): Promise<any | 'BACK' | null> {
        const dialogRef = this.dialog.open(SavedItemSelector, {
            width: '90%', maxWidth: '450px',
            height: 'auto', maxHeight: '80vh',
            data: {type, title, showBack, items}
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }

    /**
     * Abre el diálogo para opciones de ruta (Transporte o Preferencia).
     */
    public async getRouteOption<T>(
        type: 'transport' | 'preference',
        currentStep: number,
        totalSteps: number
    ): Promise<T | null> {
        const dialogRef = this.dialog.open(RouteOptionsDialogComponent, {
            width: '90%', maxWidth: '400px',
            disableClose: false,
            data: {type, currentStep, totalSteps, showBack: true}
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }

    // --- HELPERS PRIVADOS DEL FLUJO ---

    public async askForSearchMethod(): Promise<AddPoiMethod> {
        const dialogRef = this.dialog.open(AddPoiDialogComponent, {
            width: '90%', maxWidth: '400px'
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }

    public async executeSearchMethod(method: AddPoiMethod, confirm: boolean): Promise<any | 'BACK' | null> {
        let potentialPOI: POISearchModel | null = null;

        try {
            if (method === 'coords') {
                const dialogRef = this.dialog.open(CoordsSearchDialogComponent, {width: '90%', maxWidth: '400px'});
                const coords = await firstValueFrom(dialogRef.afterClosed());

                if (!coords) return 'BACK';

                const snackBarRef = this.snackBar.open('Obteniendo dirección...', '', {duration: 0});
                try {
                    potentialPOI = await this.mapSearchService.searchPOIByCoords(coords.lat, coords.lon);
                } finally {
                    snackBarRef.dismiss();
                }

                if (!potentialPOI) {
                    this.snackBar.open('No se pudo obtener la dirección.', 'OK', {duration: 3000});
                    return 'BACK';
                }

            } else if (method === 'name') {
                const dialogRef = this.dialog.open(PlaceNameSearchDialogComponent, {width: '90%', maxWidth: '400px'});
                const nameStr = await firstValueFrom(dialogRef.afterClosed());

                if (!nameStr) return 'BACK';

                const snackBarRef = this.snackBar.open('Buscando lugar...', '', {duration: 0});
                let results: POISearchModel[] = [];
                try {
                    results = await this.mapSearchService.searchPOIByPlaceName(nameStr);
                } finally {
                    snackBarRef.dismiss();
                }

                if (results && results.length > 0) {
                    if (!confirm) return {name: nameStr, lat: results[0].lat, lon: results[0].lon}; // Retorno simple si no confirmamos

                    // Si hay que confirmar y hay varios, usamos el selector
                    const selectedResult = await this.selectSavedItem(
                        'search-results',
                        'Resultados de búsqueda',
                        true,
                        results
                    );
                    if (selectedResult === 'BACK') return 'BACK';
                    if (!selectedResult) return null;
                    potentialPOI = selectedResult;
                } else {
                    this.snackBar.open('No se encontraron resultados', 'OK', {duration: 3000});
                    return 'BACK';
                }
            }
        } catch (error: any) {
            console.error(error);
            this.snackBar.open(`Búsqueda sin resultados.`, '', {duration: 3000});
            return 'BACK';
        }

        if (potentialPOI) {
            if (confirm) {
                const confirmRef = this.dialog.open(PointConfirmationDialog, {
                    width: '90%', maxWidth: '400px',
                    data: potentialPOI
                });
                const confirmed = await firstValueFrom(confirmRef.afterClosed());
                if (confirmed) {
                    // Mapeo simple
                    return {
                        lat: potentialPOI.lat,
                        lon: potentialPOI.lon,
                        name: potentialPOI.placeName
                    };
                } else {
                    return 'BACK';
                }
            } else {
                return {
                    lat: potentialPOI.lat,
                    lon: potentialPOI.lon,
                    name: potentialPOI.placeName
                };
            }
        }
        return null;
    }

    /** Inicia el Wizard completo del flujo de rutas
     *  */
    async startRouteFlow(config: RouteFlowConfig = {}): Promise<RouteFlowData | null> {
        // 1. Cargar preferencias (LocalStorage o Firestore)
        let loadedPrefs: PreferenceModel | undefined;
        try {
            const localStr = localStorage.getItem('user_preferences');
            if (localStr) {
                loadedPrefs = PreferenceModel.fromJSON(JSON.parse(localStr));
            } else {
                loadedPrefs = await this.preferenceService.readPreferences();
                if (loadedPrefs) {
                    localStorage.setItem('user_preferences', JSON.stringify(loadedPrefs.toJSON()));
                }
            }
        } catch (e) {
            console.warn('No se pudieron cargar preferencias:', e);
        }

        // Pasamos loadedPrefs al contexto
        const context = new RouteFlowContext(config, this, loadedPrefs);

        // 2. Máquina de estados
        let currentState: FlowState | null = new OriginState();

        while (currentState !== null) {
            currentState = await currentState.execute(context);
        }

        if (this.isDataComplete(context.data)) {
            return context.data;
        }

        return null;
    }

    private isDataComplete(data: RouteFlowData): boolean {
        // La matrícula es obligatoria solo si el transporte es VEHICULO
        const needsVehicle = data.transport === TIPO_TRANSPORTE.VEHICULO;
        const hasVehicle = !!data.matricula;

        return !!(data.origin && data.destination && data.transport && (!needsVehicle || hasVehicle));
    }

    showFeedback(message: string): void {
        this.snackBar.open(message, 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['high-z-index-toast']
        });
    }
}

