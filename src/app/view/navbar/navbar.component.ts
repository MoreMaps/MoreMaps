import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {CoordsSearchDialogComponent} from './coords-search-dialog/coords-search-dialog';
import {MapUpdateService} from '../../services/map-update-service/map-updater';
import {PlaceNameSearchDialogComponent} from './placename-search-dialog/placename-search-dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {RouteOriginDialog, RouteOriginMethod} from '../route/route-origin-dialog/route-origin-dialog';
import {firstValueFrom} from 'rxjs';
import {AddPoiDialogComponent, AddPoiMethod} from './add-poi-dialog/add-poi-dialog';
import {RouteOptionsDialogComponent} from '../route/route-options-dialog/route-options-dialog';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {SavedItemSelector} from '../../services/saved-items/saved-item-selector-dialog/savedSelectorData';
import {MapSearchService} from '../../services/map-search-service/map-search.service';
import {POISearchModel} from '../../data/POISearchModel';
import {PointConfirmationDialog} from './point-confirmation-dialog/point-confirmation-dialog';
import {Geohash, geohashForLocation} from 'geofire-common';

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
    private mapSearchService = inject(MapSearchService);
    private mapUpdateService = inject(MapUpdateService);
    private snackBar = inject(MatSnackBar);
    private route = inject(ActivatedRoute);
    isRouteMode: boolean = false;

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.isRouteMode = params['mode'] === 'route';
        });
    }

    /** El navbar emplea esta función para indicar al usuario en qué sección se encuentra. */
    isActive(route: string): boolean {
        return this.router.url.split(/[?#]/)[0] === route;
    }

    /** Empleada por los botones del navbar para que puedan enviar a distintas páginas de la app. */
    navigateTo(route: string): void {
        this.router.navigate([route]);
    }

    // ==========================================================
    // FLUJO 1: BÚSQUEDA DE POI
    // ==========================================================
    async openAddDialog(): Promise<void> {
        // --- PASO 1: Method ---
        // Preguntar por cómo quiere buscar el nuevo POI
        const method = await this.askForSearchMethod();
        if (!method) return; // Usuario canceló

        // --- PASO 2: Datos ---
        // Pedir los datos de búsqueda según el method elegido
        const result = await this.executeSearchMethod(method, false);

        // --- PASO 3: Navegar ---
        if (result) {
            this.router.navigate(['/map'], {queryParams: result});
        } else {
            this.router.navigate(['/map'], {queryParams: {}});
        }
    }

    // ==========================================================
    // FLUJO 2: CÁLCULO DE RUTA
    // ==========================================================

    // 2. Búsqueda de rutas
    async openRouteSearch(): Promise<void> {
        let step = 1;
        const totalSteps = 4; // Origen, Destino, Transporte, Preferencia

        // Variables para almacenar el estado
        let originData: any = null;
        let destData: any = null;
        let transporte: TIPO_TRANSPORTE | null = null;
        let selectedVehicleMatricula: string | undefined = undefined;
        let preferencia: PREFERENCIA | null = null;

        // Variables para inicio y fin
        let startHash: Geohash = '';
        let endHash: Geohash = '';

        // Bucle de navegación
        while (step <= totalSteps && step > 0) {

            switch (step) {
                // --- PASO 1: ORIGEN ---
                case 1: {
                    const res = await this.getPointFromUser(
                        'Punto de Origen',
                        '¿Desde dónde quieres salir?',
                        step, totalSteps, false // showBack = false (primer paso)
                    );

                    if (res === 'BACK') {
                        // No hay atrás desde el paso 1, salimos o no hacemos nada
                        return;
                    }
                    if (!res) return; // Cancelado

                    originData = res;
                    startHash = originData.hash || geohashForLocation([originData.lat, originData.lon], 7);
                    step++; // Avanzar
                    break;
                }

                // --- PASO 2: DESTINO ---
                case 2: {
                    const res = await this.getPointFromUser(
                        'Punto de Destino',
                        '¿A dónde quieres ir?',
                        step, totalSteps, true
                    );

                    if (res === 'BACK') {
                        step--; // Volver al paso 1
                        break;
                    }
                    if (!res) return; // Cancelado

                    destData = res;
                    endHash = destData.hash || geohashForLocation([destData.lat, destData.lon], 7);
                    step++;
                    break;
                }

                // --- PASO 3: TRANSPORTE (Y VEHÍCULO) ---
                case 3: {
                    const res = await this.getRouteOption<TIPO_TRANSPORTE | 'BACK'>('transport', step, totalSteps);

                    if (res === 'BACK') {
                        step--;
                        break;
                    }
                    if (!res) return;

                    transporte = res as TIPO_TRANSPORTE;

                    // Lógica de Vehículo (Sub-paso)
                    if (transporte === TIPO_TRANSPORTE.VEHICULO) {
                        // Podemos considerar esto un "paso 3.5"
                        // Nota: He añadido soporte para 'BACK' en selectSavedItem también
                        const savedVehicle = await this.selectSavedItem('vehiculos', 'Selecciona tu vehículo', true);

                        if (savedVehicle === 'BACK') {
                            // Si da atrás en vehículo, volvemos a elegir transporte
                            break;
                        }
                        if (!savedVehicle) return; // Cancelado total

                        selectedVehicleMatricula = savedVehicle.matricula;
                    } else {
                        selectedVehicleMatricula = undefined; // Limpiar si cambió de coche a bici
                    }

                    step++;
                    break;
                }

                // --- PASO 4: PREFERENCIA ---
                case 4: {
                    const res = await this.getRouteOption<PREFERENCIA | 'BACK'>('preference', step, totalSteps);

                    if (res === 'BACK') {
                        step--;
                        // OJO: Si veníamos de Coche, step 3 incluye vehículo.
                        // Al bajar a 3, el switch case 3 se ejecutará de nuevo preguntando transporte.
                        // Esto es buena UX: "¿Quieres cambiar transporte o vehículo?" -> Vuelves a elegir transporte.
                        break;
                    }
                    if (!res) return;

                    preferencia = res as PREFERENCIA;
                    step++; // Esto rompe el while (step se vuelve 5)
                    break;
                }
            }
        }
        // Si salimos del bucle porque step > totalSteps, la info. es completa
        if (step > totalSteps) {

            const routeParams = {
                mode: 'route',
                start: startHash,
                startName: originData!.name,
                end: endHash,
                endName: destData!.name,
                transport: transporte,
                preference: preferencia,
                matricula: selectedVehicleMatricula
            };

            const cleanParams = JSON.parse(JSON.stringify(routeParams));
            console.info(JSON.stringify(cleanParams));
            this.router.navigate(['/map'], { queryParams: cleanParams });
        }
    }

    // ==========================================================
    // HELPERS PARA FLUJOS
    // ==========================================================

    /**
     * Orquestador para obtener un punto completo a partir de Lat/Lon, o Nombre.
     * Pregunta si es guardado o búsqueda, y ejecuta la lógica.
     * Muestra el progreso y controla si se muestra el botón de "Atrás"
     */
    private async getPointFromUser(
        title: string,
        subtitle: string,
        currentStep: number,
        totalSteps: number,
        showBack: boolean
    ): Promise<any | 'BACK' | null> {
        while (true) {
            // 1. Abrir diálogo de "¿Guardado o Buscar?"
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
                    // Mapeamos el POIModel a lo que espera tu router
                    return {
                        hash: savedPoi.geohash,
                        name: savedPoi.alias || savedPoi.placeName // Usamos alias si tiene
                    };
                }
                continue;
            }

            // CASO B: Búsqueda
            const searchMethod = await this.askForSearchMethod();
            if (!searchMethod) continue;

            // Ejecutamos la búsqueda y devolvemos el resultado (lat/lon o name)
            const search = await this.executeSearchMethod(searchMethod, true);
            if (search === 'BACK') continue;
            if (search) return search;
        }
    }

    /** Abre el diálogo pequeño de elegir "Coords" vs "Topónimo" para búsqueda.*/
    private async askForSearchMethod(): Promise<AddPoiMethod> {
        const dialogRef = this.dialog.open(AddPoiDialogComponent, {
            width: '90%', maxWidth: '400px'
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }

    /** Ejecuta el diálogo correspondiente y devuelve el objeto de datos limpio */
    private async executeSearchMethod(method: AddPoiMethod, confirm: boolean): Promise<any | 'BACK' | null> {
        let potentialPOI: POISearchModel | null = null;

        try {
            // 1. Obtener input del usuario
            if (method === 'coords') {
                const dialogRef = this.dialog.open(CoordsSearchDialogComponent, {width: '90%', maxWidth: '400px'});
                const coords = await firstValueFrom(dialogRef.afterClosed());

                if (!coords) return 'BACK'; // Usuario canceló input -> Volver atrás

                // LLAMADA API: Reverse Geocoding
                const snackBarRef =  this.snackBar.open('Obteniendo dirección...', '', {duration: 0});

                try {
                    potentialPOI = await this.mapSearchService.searchPOIByCoords(coords.lat, coords.lon);
                } finally {
                    snackBarRef.dismiss();
                }

                if (!potentialPOI) {
                    this.snackBar.open("No se pudo obtener la dirección de esas coordenadas.", 'OK', {duration: 3000});
                    return 'BACK';
                }
            } else if (method === 'name') {
                const dialogRef = this.dialog.open(PlaceNameSearchDialogComponent, {width: '90%', maxWidth: '400px'});
                const nameStr = await firstValueFrom(dialogRef.afterClosed());

                if (!nameStr) return 'BACK'; // Usuario canceló input

                // LLAMADA API: Geocoding
                this.snackBar.open('Buscando lugar...', '', {duration: 1500});
                const results = await this.mapSearchService.searchPOIByPlaceName(nameStr);

                if (results && results.length > 0) {
                    if (!confirm) return  {name: nameStr}; // pasar la lista si es una búsqueda simple
                    // si es una ruta...
                    const selectedResult = await this.selectSavedItem(
                        'search-results',
                        'Resultados de búsqueda',
                        true,
                        results
                    );

                    if (selectedResult === 'BACK') return 'BACK'; // Volver a escribir nombre
                    if (!selectedResult) return null; // Cerrar

                    potentialPOI = selectedResult;
                } else {
                    this.snackBar.open('No se encontraron resultados', 'OK', {duration: 3000});
                    return 'BACK'; // Volver a intentar
                }
            }
        } catch (error) {
            console.error(error);
            this.snackBar.open(`Tu búsqueda no dió resultados.`, '', {
                duration: 3000,

            });
            return 'BACK';
        }

        // 2. CONFIRMACIÓN (Si tenemos un candidato)
        if (potentialPOI ) {
            if (confirm) {
                const confirmRef = this.dialog.open(PointConfirmationDialog, {
                    width: '90%', maxWidth: '400px',
                    data: potentialPOI // Pasamos el modelo completo (lat, lon, placeName)
                });

                const confirmed = await firstValueFrom(confirmRef.afterClosed());

                if (confirmed) {
                    // Devolvemos el formato que espera tu router/lógica
                    return {
                        lat: potentialPOI.lat,
                        lon: potentialPOI.lon,
                        name: potentialPOI.placeName
                    };
                } else {
                    return 'BACK'; // Canceló en la confirmación -> Volver a elegir cómo buscar
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

    /**Abre el diálogo de opciones (Transporte / Preferencia) */
    private async getRouteOption<T>(type: 'transport' | 'preference', currentStep: number, totalSteps: number): Promise<T | null> {
        const dialogRef = this.dialog.open(RouteOptionsDialogComponent, {
            width: '90%', maxWidth: '400px',
            disableClose: false,
            data: {type, currentStep, totalSteps, showBack: true}
        });

        return await firstValueFrom(dialogRef.afterClosed());
    }

    /** Abre el selector de items guardados
     * */
    private async selectSavedItem(
        type: 'lugares' | 'vehiculos' | 'search-results',
        title?: string,
        showBack: boolean = false,
        items?: any[] // Nuevo parámetro
    ): Promise<any | 'BACK' | null> {

        const dialogRef = this.dialog.open(SavedItemSelector, {
            width: '90%', maxWidth: '450px',
            height: 'auto', maxHeight: '80vh',
            data: {type, title, showBack, items} // Pasamos items al diálogo
        });
        return await firstValueFrom(dialogRef.afterClosed());
    }
}
