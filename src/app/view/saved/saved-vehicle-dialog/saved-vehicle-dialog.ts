import {
    Component,
    EventEmitter,
    Inject,
    inject,
    Input,
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
import {DeleteConfirmationVehiclePopupComponent} from '../../deleteVehicle/deleteVehicle';
import {VehicleModel} from '../../../data/VehicleModel';
import {EditVehicleComponent} from '../../editVehicle/editVehicle';

export interface SavedVehicleDialogData {
    item: VehicleModel;
    displayName: string;
}

@Component({
    selector: 'app-saved-vehicle-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        DeleteConfirmationVehiclePopupComponent,
        EditVehicleComponent,
        DeleteConfirmationVehiclePopupComponent,
        NgOptimizedImage
    ],
    templateUrl: './saved-vehicle-dialog.html',
    styleUrls: ['./saved-vehicle-dialog.scss']
})
export class SavedVehicleDialog implements OnInit {
    @Input() item?: VehicleModel;
    @Input() displayName?: string;

    @Output() closeEvent = new EventEmitter<void>();
    @Output() actionEvent = new EventEmitter<string>();

    public displayData!: SavedVehicleDialogData;
    public snackBar = inject(MatSnackBar);

    isEditing: WritableSignal<Boolean> = signal(false);
    isDeleting: WritableSignal<Boolean> = signal(false);

    constructor(
        @Optional() public dialogRef: MatDialogRef<SavedVehicleDialog>,
        @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: SavedVehicleDialogData
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
                displayName: this.item.alias || `${this.item.marca} ${this.item.modelo}`
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

    onNewRoute(): void {
        this.handleAction('route-vehicle');
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

    onUpdateSuccess(updatedVehicle: VehicleModel | null): void {
        if (updatedVehicle) {
            // 1. Actualizamos inmediatamente los datos que se están mostrando en el diálogo
            this.displayData.item = updatedVehicle;

            // 2. Recalculamos el displayName por si cambió el alias o modelo
            this.displayData.displayName = updatedVehicle.alias || `${updatedVehicle.marca} ${updatedVehicle.modelo}`;

            // 3. Feedback visual
            this.snackBar.open('Vehículo actualizado correctamente', 'Ok', {
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
            this.snackBar.open(`Vehículo eliminado`, 'Ok', {
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
