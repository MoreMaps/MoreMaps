import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {PREFERENCIA, TIPO_TRANSPORTE} from '../../data/RouteModel';
import {Geohash, geohashForLocation} from 'geofire-common';
import {RouteFlowService} from '../../services/map/route-flow-service';
import {firstValueFrom} from 'rxjs';
import {PlaceNameSearchDialogComponent} from './placename-search-dialog/placename-search-dialog';

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
export class NavbarComponent implements OnInit {
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    private route = inject(ActivatedRoute);
    private routeFlowService = inject(RouteFlowService);
    private dialog = inject(MatDialog);
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
        void this.router.navigate([route]);
    }

    // ==========================================================
    // FLUJO 1: BÚSQUEDA DE POI
    // ==========================================================
    async openAddDialog(): Promise<void> {
        // PASO 1: Preguntar method
        const method = await this.routeFlowService.askForSearchMethod();
        if (!method) return;

        // PASO 2: Lógica diferenciada
        if (method === 'name') {
            // CASO NOMBRE: Pedimos el texto y se lo lanzamos al mapa "crudo"
            // Esto obliga al mapa a buscar y mostrar la LISTA de resultados
            const dialogRef = this.dialog.open(PlaceNameSearchDialogComponent, {
                width: '90%', maxWidth: '400px'
            });
            const nameStr = await firstValueFrom(dialogRef.afterClosed());

            if (nameStr) {
                // Navegamos SOLO con el nombre. El mapa se encargará del resto.
                void this.router.navigate(['/map'], { queryParams: { name: nameStr } });
            }

        } else {
            // CASO COORDENADAS: Usamos el flujo existente que resuelve lat/lon
            // Aquí 'confirm' es false porque si buscas por coords, quieres ir directo
            const result = await this.routeFlowService.executeSearchMethod(method, false);

            if (result) {
                void this.router.navigate(['/map'], { queryParams: result });
            }
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
                    const res = await this.routeFlowService.getPointFromUser(
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
                    const res = await this.routeFlowService.getPointFromUser(
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

                    if (endHash === startHash) {
                        this.snackBar.open('El origen no puede ser el mismo que el destino.', 'Cerrar', {duration: 3000});
                        break;
                    }

                    step++;
                    break;
                }

                // --- PASO 3: TRANSPORTE (Y VEHÍCULO) ---
                case 3: {
                    const res = await this.routeFlowService.getRouteOption<TIPO_TRANSPORTE | 'BACK'>('transport', step, totalSteps);

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
                        const savedVehicle = await this.routeFlowService.selectSavedItem('vehiculos', 'Selecciona tu vehículo', true);

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
                    const res = await this.routeFlowService.getRouteOption<PREFERENCIA | 'BACK'>('preference', step, totalSteps);

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
            void this.router.navigate(['/map'], {queryParams: cleanParams});
        }
    }
}
