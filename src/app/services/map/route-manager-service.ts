import {inject, Injectable, OnDestroy, signal} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';

// Imports de datos y modelos
import {RouteResultModel} from '../../data/RouteResultModel';
import {RouteCostResult, RouteService} from '../Route/route.service';
import {VehicleService} from '../Vehicle/vehicle.service';
import {MapSearchService} from './map-search-service/map-search.service';
import {RouteLayerService} from './route-layer-service';
import {MarkerLayerService} from './marker-layer-service';
import {mapaTransporte, PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {GeohashDecoder} from '../../utils/geohashDecoder';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';
import {geohashForLocation} from 'geofire-common';

// Imports de UI (Dialogs)
import RouteDetailsDialog from '../../view/route/route-details-dialog/routeDetailsDialog';
import {RouteFlowService} from './route-flow-service';
import {LoadingRouteDialogComponent} from '../../utils/map-widgets';
import {RouteAlreadyExistsError} from '../../errors/Route/RouteAlreadyExistsError';
import {PreferenceService} from '../Preferences/preference.service';
import {PreferenceModel} from '../../data/PreferenceModel';

// Tipos
export interface RouteParams {
    startHash: string;
    endHash: string;
    startName: string;
    endName: string;
    transport: TIPO_TRANSPORTE;
    preference: PREFERENCIA;
    matricula?: string;
}

export interface RouteContext {
    routeResult: RouteResultModel;
    coste: RouteCostResult | null;
    params: RouteParams;
    vehicleAlias?: string;
}

@Injectable({
    providedIn: 'root'
})
export class RouteManagerService implements OnDestroy {
    public hasActiveRoute = signal<boolean>(false);
    // --- INYECCIONES DE UI Y NAVEGACIÓN ---
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private location = inject(Location);
    private route = inject(ActivatedRoute); // Para navegar relativo a la ruta actual
    // --- INYECCIONES DE LÓGICA ---
    private mapSearchService = inject(MapSearchService);
    private routeService = inject(RouteService);
    private vehicleService = inject(VehicleService);
    private routeLayerService = inject(RouteLayerService);
    private markerLayerService = inject(MarkerLayerService);
    private routeFlowService = inject(RouteFlowService);
    private preferenceService = inject(PreferenceService);
    // --- ESTADO ---
    private routeDialogRef: MatDialogRef<RouteDetailsDialog> | null = null;
    private currentParams: RouteParams | null = null;
    private currentContext: RouteContext | null = null;

    ngOnDestroy(): void {
        this.clearRouteSession();
    }

    /**
     * Inicia una sesión de ruta completa.
     * Maneja UI, Errores, URL y Diálogos.
     */
    async loadRouteSession(params: RouteParams): Promise<void> {
        let loadingRef: MatDialogRef<LoadingRouteDialogComponent> | null = null;

        try {
            // 1. UI Loading (Bloqueante)
            loadingRef = this.dialog.open(LoadingRouteDialogComponent, {
                disableClose: true, hasBackdrop: true, panelClass: 'loading-dialog-panel'
            });

            // 2. Lógica de Cálculo (Interna)
            const context = await this.internalCalculate(params);

            // 3. Actualizar URL (Efecto secundario)
            this.updateUrl(params);

            // 4. Abrir Diálogo de Resultados y conectar eventos
            await this.openRouteDetailsDialog(context);

        } catch (e) {
            this.handleError(e);
            // Si fallamos y no había ruta previa, limpiamos
            if (!this.hasActiveRoute()) {
                this.clearRouteSession();
            }
        } finally {
            loadingRef?.close();
        }
    }

    /**
     * Limpia Capas, Diálogos, URL y Estado.
     * @param navigate Si es true, limpia la URL. Si es false (ngOnDestroy), solo limpia datos internos.
     */
    clearRouteSession(navigate: boolean = true): void {
        this.routeLayerService.clear();
        this.markerLayerService.clearMarkers();

        if (this.routeDialogRef) {
            this.routeDialogRef.close();
            this.routeDialogRef = null;
        }

        this.currentParams = null;
        this.currentContext = null;
        this.hasActiveRoute.set(false);

        // Solo navegamos si nos lo piden explícitamente (evita conflictos al salir del mapa)
        if (navigate) {
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: {},
                replaceUrl: true
            });
        }
    }

    // --- LÓGICA PRIVADA DE CÁLCULO ---

    private async internalCalculate(params: RouteParams): Promise<RouteContext> {
        // Validaciones
        if (params.startHash === params.endHash) throw new Error('Origen y destino iguales');

        // Limpieza visual previa
        this.routeLayerService.clear();
        this.markerLayerService.clearMarkers();

        // Llamadas API
        const routeResult = await this.mapSearchService.searchRoute(
            params.startHash, params.endHash, params.transport, params.preference
        );

        let coste: RouteCostResult | null = null;
        let vehicleAlias = params.matricula || '';

        if (params.transport === TIPO_TRANSPORTE.VEHICULO) {
            if (!params.matricula) throw new Error('Falta matrícula');
            const datosVehiculo = await this.vehicleService.readVehicle(params.matricula);
            vehicleAlias = datosVehiculo.alias || params.matricula;
            coste = await this.routeService.getRouteCost(
                routeResult, params.transport, datosVehiculo.consumoMedio, datosVehiculo.tipoCombustible as FUEL_TYPE
            );
        } else {
            coste = await this.routeService.getRouteCost(routeResult, params.transport);
        }

        // Pintar
        const start = GeohashDecoder.decodeGeohash(params.startHash);
        const end = GeohashDecoder.decodeGeohash(params.endHash);
        this.routeLayerService.drawAnchors(
            {lat: start[1], lon: start[0], name: params.startName},
            {lat: end[1], lon: end[0], name: params.endName}
        );
        if (routeResult.geometry) this.routeLayerService.drawGeometry(routeResult.geometry);

        // Actualizar estado interno
        this.currentParams = params;
        this.currentContext = {routeResult, coste, params, vehicleAlias};
        this.hasActiveRoute.set(true);

        return this.currentContext;
    }

    // --- GESTIÓN DE DIÁLOGOS Y EVENTOS ---

    private async openRouteDetailsDialog(context: RouteContext) {
        if (!this.currentContext) return;

        // 1. Aseguramos que no haya diálogo previo abierto
        if (this.routeDialogRef) {
            this.routeDialogRef.close();
            this.routeDialogRef = null;
        }

        // 2. Cargar preferencias frescas (Firebase -> LocalStorage)
        // Hacemos esto ANTES de abrir el diálogo para evitar abrirlo dos veces
        let userPrefs: PreferenceModel | undefined;
        try {
            userPrefs = await this.preferenceService.readPreferences();
        } catch (error) {
            console.warn('No se pudieron cargar las preferencias al abrir detalles:', error);
        }

        // 3. Abrir el diálogo UNA SOLA VEZ con todos los datos
        this.routeDialogRef = this.dialog.open(RouteDetailsDialog, {
            hasBackdrop: false,
            panelClass: 'route-dialog-panel',
            data: {
                origenName: context.params.startName,
                destinoName: context.params.endName,
                transporte: context.params.transport,
                preference: context.params.preference,
                matricula: context.params.matricula,
                vehicleAlias: context.vehicleAlias,
                routeResult: context.routeResult,
                coste: context.coste,
                preferences: userPrefs // Pasamos las preferencias cargadas
            }
        });

        // 4. Capturar la instancia ACTUAL y suscribirse
        const instance = this.routeDialogRef.componentInstance;

        // SUSCRIPCIONES A EVENTOS

        // Swap
        instance.swap.subscribe(() => {
            if (!this.currentParams) return;
            this.routeDialogRef?.close();
            const newParams = {
                ...this.currentParams,
                startHash: this.currentParams.endHash, endHash: this.currentParams.startHash,
                startName: this.currentParams.endName, endName: this.currentParams.startName
            };
            void this.loadRouteSession(newParams);
        });

        // Cambiar Preferencia
        instance.preferenceChange.subscribe((newPref) => {
            if (!this.currentParams) return;

            // 1. Cerramos el diálogo INMEDIATAMENTE para que se vea el "Cargando..."
            // y evitar conflictos de capas.
            this.routeDialogRef?.close();
            this.routeDialogRef = null;

            // 2. Recalculamos
            void this.loadRouteSession({ ...this.currentParams, preference: newPref });
        });

        // Guardar
        instance.save.subscribe(async () => {
            try {
                const routeId = await this.saveCurrentRoute()
                this.showActionSnackBar('Ruta guardada correctamente', 'VER', routeId)
            } catch (e) {
                if (e instanceof RouteAlreadyExistsError)
                    this.snackBar.open(e.message, 'OK', {duration: 3000});
                else
                    this.snackBar.open('Error al guardar ruta', 'Cerrar');
            }
        });

        // Editar Atributos
        instance.editOrigin.subscribe(() => this.handleEditAttribute(1));
        instance.editDestination.subscribe(() => this.handleEditAttribute(2));
        instance.editTransport.subscribe(() => this.handleEditAttribute(3));

        // Cerrar
        instance.closeRoute.subscribe(() => {
            this.clearRouteSession();
        });
    }

    private showActionSnackBar(msg: string, action: string, routeId: string) {
        const snackBarRef =
            this.snackBar.open(msg, action, {
                duration: 5000,
                horizontalPosition: 'left',
                verticalPosition: 'bottom'
            });
        snackBarRef.onAction().subscribe(() => {
            void this.router.navigate(['/saved'], {
                queryParams: {
                    type: 'rutas',
                    id: routeId,
                }
            });
        });
    }

    // --- LÓGICA DE EDICIÓN ---
    /**
     * Gestiona la lógica de edición cuando el usuario pulsa el lápiz en el diálogo.
     * 1. Pide el dato nuevo al usuario (Flow).
     * 2. Si cambia, lanza una nueva sesión de ruta (Manager).
     */
    private async handleEditAttribute(step: number) {
        // Guardamos referencia al contexto actual antes de cerrar nada
        if (!this.currentParams || !this.currentContext) return;

        // 1. Cerramos el diálogo actual.
        // Esto es CRÍTICO para evitar conflictos de backdrop y z-index con los nuevos diálogos.
        if (this.routeDialogRef) {
            this.routeDialogRef.close();
            this.routeDialogRef = null;
        }

        // Clonamos los parámetros para no mutar el estado hasta confirmar el cambio
        const newParams = {...this.currentParams};
        let hasChanges = false;

        try {
            // --- CASO 1: CAMBIAR ORIGEN ---
            if (step === 1) {
                const res = await this.routeFlowService.getPointFromUser(
                    'Cambiar Origen', '¿Desde dónde sales?', 1, 1, true
                );

                if (res && res !== 'BACK') {
                    newParams.startName = res.name;
                    // Aseguramos que existe el hash, si viene de coords puras lo calculamos
                    newParams.startHash = res.hash || geohashForLocation([res.lat, res.lon], 7);
                    hasChanges = true;
                }
            }

            // --- CASO 2: CAMBIAR DESTINO ---
            else if (step === 2) {
                const res = await this.routeFlowService.getPointFromUser(
                    'Cambiar Destino', '¿A dónde quieres ir?', 1, 1, true
                );

                if (res && res !== 'BACK') {
                    newParams.endName = res.name;
                    newParams.endHash = res.hash || geohashForLocation([res.lat, res.lon], 7);
                    hasChanges = true;
                }
            }

            // --- CASO 3: CAMBIAR TRANSPORTE ---
            else if (step === 3) {
                const res = await this.routeFlowService.getRouteOption('transport', 1, 1);

                if (res && res !== 'BACK') {
                    const selectedTransport = res as TIPO_TRANSPORTE;

                    // Si elige Vehículo, paso obligatorio: Matrícula
                    if (selectedTransport === TIPO_TRANSPORTE.VEHICULO) {
                        const savedVehicle = await this.routeFlowService.selectSavedItem(
                            'vehiculos', 'Selecciona tu vehículo', true
                        );

                        if (savedVehicle && savedVehicle !== 'BACK') {
                            newParams.transport = TIPO_TRANSPORTE.VEHICULO;
                            newParams.matricula = savedVehicle.matricula;
                            hasChanges = true;
                        }
                        // Si da a 'Atrás' en vehículos, no hacemos cambios (se queda como estaba)
                    } else {
                        // Cambio directo a Pie o Bicicleta
                        newParams.transport = selectedTransport;
                        newParams.matricula = undefined;
                        hasChanges = true;
                    }
                }
            }

            // 2. APLICAR RESULTADO
            if (hasChanges) {
                // Si hubo cambios, recalculamos la ruta (Loading... -> API -> Dialog)
                await this.loadRouteSession(newParams);
            } else {
                // Si NO hubo cambios (Usuario canceló o dio atrás),
                // simplemente reabrimos el diálogo con el contexto QUE YA TENÍAMOS.
                // Esto es instantáneo y no llama a la API.
                await this.openRouteDetailsDialog(this.currentContext);
            }

        } catch (e) {
            console.error('Error editando atributos de ruta:', e);
            // En caso de error, intentamos restaurar la vista anterior
            if (this.currentContext) {
                await this.openRouteDetailsDialog(this.currentContext);
            }
        }
    }

    // --- HELPERS ---

    private updateUrl(params: RouteParams) {
        // Actualiza la URL sin recargar la página
        const urlTree = this.router.createUrlTree([], {
            relativeTo: this.route,
            queryParams: {
                mode: 'route',
                start: params.startHash,
                end: params.endHash,
                // ... resto de params
            }
        });
        this.location.replaceState(urlTree.toString());
    }

    private handleError(e: any) {
        const msg = (e instanceof ImpossibleRouteError)
            ? 'No existe ruta entre puntos.'
            : `Error: ${e.message}`;
        this.snackBar.open(msg, 'Cerrar', {duration: 5000});
    }

    /**
     * Guarda la ruta actualmente calculada en la base de datos.
     * Genera un alias automático si no se provee uno (ej.: "Coche de Casa a Trabajo").
     */
    private async saveCurrentRoute(): Promise<string> {
        if (!this.currentContext) {
            throw new Error("No hay contexto de ruta activo para guardar.");
        }

        const {params, routeResult} = this.currentContext;

        // Generar un nombre amigable por defecto
        // Ejemplo: "Ruta de Madrid a Barcelona (Coche)"
        const transporteStr = mapaTransporte[params.transport] || 'Ruta';
        // Tomamos solo la primera parte del nombre (antes de la coma) para que no sea kilométrico
        const startShort = params.startName.split(',')[0];
        const endShort = params.endName.split(',')[0];

        const defaultAlias = `Ruta de ${startShort} a ${endShort} (${transporteStr})`;

        // Llamada al servicio de persistencia
        const savedRoute = await this.routeService.createRoute(
            params.startHash,
            params.endHash,
            defaultAlias,
            params.transport,
            params.startName,
            params.endName,
            params.preference,
            routeResult,
            params.matricula // Puede ser undefined si es a pie, el servicio lo maneja
        );

        // Devolvemos el ID por si queremos navegar a ella o mostrar un link
        return savedRoute.id();
    }
}
