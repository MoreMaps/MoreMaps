import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {geohashForLocation} from 'geofire-common';
import {firstValueFrom} from 'rxjs';

// Servicios y Componentes
import {RouteFlowService} from '../../services/map/route-flow-service';
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
    // FLUJO 1: BÚSQUEDA DE POI (Punto de interés individual)
    // ==========================================================
    async openAddDialog(): Promise<void> {
        // PASO 1: Preguntar (Nombre o Coordenadas)
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
            // CASO COORDENADAS: Usamos el flujo existente en el servicio que resuelve lat/lon
            // 'confirm' es false porque si buscas por coords explícitas, quieres ir directo.
            const result = await this.routeFlowService.executeSearchMethod(method, false);

            if (result && result !== 'BACK') {
                void this.router.navigate(['/map'], { queryParams: result });
            }
        }
    }

    // ==========================================================
    // FLUJO 2: CÁLCULO DE RUTA
    // ==========================================================

    async openRouteSearch(): Promise<void> {
        // 1. Iniciar el flujo completo a través del servicio
        // El servicio maneja internamente el contexto, los pasos (Origen -> Destino -> Transporte -> Preferencia) y la persistencia.
        const flowData = await this.routeFlowService.startRouteFlow();

        // 2. Si el usuario canceló en algún punto, flowData será null
        if (!flowData) {
            return;
        }

        // 3. Si tenemos datos completos, preparamos la navegación
        // Garantizamos que existen los hashes (calculándolos si faltan)
        const startHash = flowData.origin!.hash || geohashForLocation([flowData.origin!.lat, flowData.origin!.lon], 7);
        const endHash = flowData.destination!.hash || geohashForLocation([flowData.destination!.lat, flowData.destination!.lon], 7);

        // Validación final de seguridad
        if (startHash === endHash) {
            this.snackBar.open('El origen no puede ser el mismo que el destino.', 'Cerrar', {duration: 3000});
            return;
        }

        // 4. Construir parámetros para la URL
        const routeParams = {
            mode: 'route',
            start: startHash,
            startName: flowData.origin!.name,
            end: endHash,
            endName: flowData.destination!.name,
            transport: flowData.transport,
            preference: flowData.preference,
            matricula: flowData.matricula // Puede ser undefined si no es vehículo, JSON.stringify lo limpiará
        };

        // 5. Navegar al mapa con los datos limpios
        const cleanParams = JSON.parse(JSON.stringify(routeParams));
        void this.router.navigate(['/map'], {queryParams: cleanParams});
    }
}
