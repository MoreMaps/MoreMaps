import {
    Component,
    EventEmitter,
    Inject,
    inject,
    Input, OnChanges,
    OnInit,
    Optional,
    Output,
    signal,
    SimpleChanges,
    WritableSignal
} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RouteModel} from '../../../data/RouteModel';
import {DeleteConfirmationRoutePopupComponent} from '../../deleteRoute/deleteRoute';
import {EditRouteComponent} from '../../editRoute/editRoute';

export interface SavedRouteDialogData {
    item: RouteModel;
    displayName: string;
}

@Component({
    selector: 'app-saved-route-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        DeleteConfirmationRoutePopupComponent,
        EditRouteComponent,
        NgOptimizedImage
    ],
    templateUrl: './saved-route-dialog.html',
    styleUrls: ['./saved-route-dialog.scss']
})
export class SavedRouteDialog implements OnInit, OnChanges {
    @Input() item?: RouteModel;
    @Input() displayName?: string;

    @Output() closeEvent = new EventEmitter<void>();
    @Output() actionEvent = new EventEmitter<string>();

    public displayData!: SavedRouteDialogData;
    public snackBar = inject(MatSnackBar);

    isEditing: WritableSignal<Boolean> = signal(false);
    isDeleting: WritableSignal<Boolean> = signal(false);

    constructor(
        @Optional() public dialogRef: MatDialogRef<SavedRouteDialog>,
        @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: SavedRouteDialogData
    ) {}

    ngOnInit(): void {
        this.updateDisplayData();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['item'] && !this.dialogData) {
            this.updateDisplayData();
            // El componente hijo EditVehicleComponent maneja su propio ngOnChanges
            // para actualizar el formulario cuando cambia el vehicle
        }
    }

    updateDisplayData(): void {
        if (this.dialogData) {
            this.displayData = this.dialogData;
        } else if (this.item) {
            this.displayData = {
                item: this.item,
                displayName: this.item.alias
            };
        }
    }

    close(): void {
        if (this.dialogRef) this.dialogRef.close();
        else this.closeEvent.emit();
    }

    handleAction(action: string): void {
        if (this.dialogRef && action !== 'edit') this.dialogRef.close(action);
        else this.actionEvent.emit(action);
    }

    // --- ACCIONES VISTA ---

    onShowOnMap(): void {
        this.handleAction('showOnMap');
    }

    onEdit(): void {
        this.isEditing.set(true);
    }

    onDelete(): void {
        this.isDeleting.set(true);
    }

    // --- MANEJO DE EVENTOS DEL HIJO (EditVehicle) ---

    onCancelEdit(): void {
        this.isEditing.set(false);
    }

    onUpdateSuccess(updatedRoute: RouteModel | null): void {
        if (updatedRoute) {
            // 1. Actualizamos inmediatamente los datos que se están mostrando en el diálogo
            this.displayData.item = updatedRoute;

            // 2. Recalculamos el displayName por si cambió el alias
            this.displayData.displayName = updatedRoute.alias;

            // 3. Feedback visual
            this.snackBar.open('Ruta actualizada correctamente', 'Ok', {
                duration: 3000,
                horizontalPosition: 'start',
                verticalPosition: 'bottom'
            });

            // 4. Notificamos al padre (SavedItems) para que recargue la lista de fondo
            this.handleAction('update');

            // 5. Cerramos el modo edición (la vista ahora leerá this.displayData.item actualizado)
            this.isEditing.set(false);
        } else {
            this.snackBar.open('Error al actualizar', 'Cerrar', {
                duration: 3000,
                horizontalPosition: 'start',
                verticalPosition: 'bottom'
            });
        }
    }

    // --- BORRADO ---

    onCancelDelete(): void {
        this.isDeleting.set(false);
    }

    onDeleteSuccess(success: boolean): void {
        this.isDeleting.set(false);
        if (success) {
            this.snackBar.open(`Ruta eliminada`, 'Ok', {
                duration: 3000,
                horizontalPosition: 'left',
                verticalPosition: 'bottom'
            });
            this.handleAction('delete');
        } else {
            this.snackBar.open('No se pudo eliminar', 'Ok', {
                duration: 3000,
                horizontalPosition: 'left',
                verticalPosition: 'bottom'
            });
        }
    }
}
