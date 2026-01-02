import {Injectable, inject, signal} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router, ActivatedRoute} from '@angular/router';
import {Location} from '@angular/common';

// Imports de datos y modelos
import {RouteResultModel} from '../../data/RouteResultModel';
import {RouteCostResult, RouteService} from '../Route/route.service';
import {VehicleService} from '../Vehicle/vehicle.service';
import {MapSearchService} from './map-search-service/map-search.service';
import {RouteLayerService} from './route-layer-service';
import {MarkerLayerService} from './marker-layer-service';
import {TIPO_TRANSPORTE, PREFERENCIA, mapaTransporte} from '../../data/RouteModel';
import {FUEL_TYPE} from '../../data/VehicleModel';
import {GeohashDecoder} from '../../utils/geohashDecoder';
import {ImpossibleRouteError} from '../../errors/Route/ImpossibleRouteError';
import {geohashForLocation} from 'geofire-common';

// Imports de UI (Dialogs)
import {RouteDetailsDialog} from '../../view/route/route-details-dialog/routeDetailsDialog';
import {RouteFlowService} from './route-flow-service';
import {FlowPoint} from './route-flow-state';
import {LoadingRouteDialogComponent} from '../../utils/map-widgets';

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
export class RouteManagerService {
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
    private routeFlowService = inject(RouteFlowService); // Ahora el manager usa el flow

    // --- ESTADO ---
    private routeDialogRef: MatDialogRef<RouteDetailsDialog> | null = null;
    private currentParams: RouteParams | null = null;
    private currentContext: RouteContext | null = null;
    public hasActiveRoute = signal<boolean>(false);

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
            this.openRouteDetailsDialog(context);

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
     */
    clearRouteSession(): void {
        this.routeLayerService.clear();
        this.markerLayerService.clearMarkers();

        if (this.routeDialogRef) {
            this.routeDialogRef.close();
            this.routeDialogRef = null;
        }

        this.currentParams = null;
        this.currentContext = null;
        this.hasActiveRoute.set(false);

        // Limpiar URL
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
        });
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
        this.currentContext = { routeResult, coste, params, vehicleAlias };
        this.hasActiveRoute.set(true);

        return this.currentContext;
    }

    // --- GESTIÓN DE DIÁLOGOS Y EVENTOS ---

    private openRouteDetailsDialog(context: RouteContext) {
        if (this.routeDialogRef) this.routeDialogRef.close();

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
            }
        });

        const instance = this.routeDialogRef.componentInstance;

        // SUSCRIPCIONES A EVENTOS (La lógica que antes estaba en map-page.component.ts)

        // 1. Swap
        instance.swap.subscribe(() => {
            if (!this.currentParams) return;
            const newParams = { ...this.currentParams,
                startHash: this.currentParams.endHash, endHash: this.currentParams.startHash,
                startName: this.currentParams.endName, endName: this.currentParams.startName
            };
            void this.loadRouteSession(newParams);
        });

        // 2. Cambiar Preferencia
        instance.preferenceChange.subscribe((newPref) => {
            if (!this.currentParams) return;
            void this.loadRouteSession({ ...this.currentParams, preference: newPref });
        });

        // 3. Guardar
        instance.save.subscribe(async () => {
            try {
                await this.saveCurrentRoute(); // Lógica de guardado en BD
                this.snackBar.open('Ruta guardada correctamente', 'OK', { duration: 3000 });
            } catch (e) {
                this.snackBar.open('Error al guardar ruta', 'Cerrar');
            }
        });

        // 4. Editar Atributos (Llama al FlowService)
        instance.editOrigin.subscribe(() => this.handleEditAttribute(1));
        instance.editDestination.subscribe(() => this.handleEditAttribute(2));
        instance.editTransport.subscribe(() => this.handleEditAttribute(3));

        // 5. Cerrar
        instance.closeRoute.subscribe(() => {
            this.clearRouteSession();
        });
    }

    // --- LÓGICA DE EDICIÓN ---
    /**
     * Gestiona la lógica de edición cuando el usuario pulsa el lápiz en el diálogo.
     * 1. Pide el dato nuevo al usuario (Flow).
     * 2. Si cambia, lanza una nueva sesión de ruta (Manager).
     */
    private async handleEditAttribute(step: number) {
        // Seguridad: No podemos editar si no hay parámetros actuales
        if (!this.currentParams) return;

        // Copia de seguridad de los parámetros actuales
        // Usamos spread operator (...) para no mutar el objeto original todavía
        let newParams: RouteParams = { ...this.currentParams };
        let dataChanged = false;

        switch (step) {
            case 1: // EDITAR ORIGEN
                const originData = await this.routeFlowService.getPointFromUser(
                    'Cambiar Origen',
                    '¿Desde dónde quieres salir?',
                    1, 4, true
                );

                if (originData && originData !== 'BACK') {
                    const point = originData as FlowPoint;
                    newParams.startName = point.name;
                    // Si el flow no devuelve hash (raro), lo calculamos
                    newParams.startHash = point.hash || geohashForLocation([point.lat, point.lon], 7);
                    dataChanged = true;
                }
                break;

            case 2: // EDITAR DESTINO
                const destData = await this.routeFlowService.getPointFromUser(
                    'Cambiar Destino',
                    '¿A dónde quieres ir?',
                    2, 4, true
                );

                if (destData && destData !== 'BACK') {
                    const point = destData as FlowPoint;
                    newParams.endName = point.name;
                    newParams.endHash = point.hash || geohashForLocation([point.lat, point.lon], 7);
                    dataChanged = true;
                }
                break;

            case 3: // EDITAR TRANSPORTE
                const newTransport = await this.routeFlowService.getRouteOption<TIPO_TRANSPORTE | 'BACK'>('transport', 3, 4);

                if (newTransport && newTransport !== 'BACK') {
                    // Lógica específica de vehículos
                    if (newTransport === TIPO_TRANSPORTE.VEHICULO) {
                        const savedVehicle = await this.routeFlowService.selectSavedItem(
                            'vehiculos',
                            'Selecciona tu vehículo',
                            true
                        );

                        // Si cancela la selección de vehículo, cancelamos toda la edición
                        if (!savedVehicle || savedVehicle === 'BACK') return;

                        // Si es el mismo coche y mismo transporte, no hacemos nada
                        if (newTransport === this.currentParams.transport &&
                            savedVehicle.matricula === this.currentParams.matricula) {
                            return;
                        }

                        newParams.matricula = savedVehicle.matricula;
                    }

                    newParams.transport = newTransport as TIPO_TRANSPORTE;
                    dataChanged = true;
                }
                break;
        }

        // Si hubo cambios, REINICIAMOS LA SESIÓN con los nuevos datos.
        // Esto activará el spinner, recalculará al completo y volverá a abrir el diálogo actualizado.
        if (dataChanged) {
            await this.loadRouteSession(newParams);
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
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
    }

    /**
     * Guarda la ruta actualmente calculada en la base de datos.
     * Genera un alias automático si no se provee uno (ej.: "Coche de Casa a Trabajo").
     */
    private async saveCurrentRoute(): Promise<string> {
        if (!this.currentContext) {
            throw new Error("No hay contexto de ruta activo para guardar.");
        }

        const { params, routeResult } = this.currentContext;

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
