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
    WritableSignal
} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {POIModel} from '../../../data/POIModel';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Auth} from '@angular/fire/auth';
import {POIService} from '../../../services/POI/poi.service';
import {POI_REPOSITORY} from '../../../services/POI/POIRepository';
import {POIDB} from '../../../services/POI/POIDB';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DeleteConfirmationPOIPopupComponent} from '../../deletePOI/deletePOI';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';

export interface SavedItemDialogData {
    item: POIModel;
    displayName: string;
    isDarkTheme?: boolean;
}

@Component({
    selector: 'app-saved-poi-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        NgOptimizedImage,
        ReactiveFormsModule,
        DeleteConfirmationPOIPopupComponent,
        MatMenu,
        MatMenuTrigger,
        MatMenuItem,
    ],
    templateUrl: './saved-poi-dialog.html',
    styleUrls: ['./saved-poi-dialog.scss'],
    providers: [POIService, {provide: POI_REPOSITORY, useClass: POIDB}]
})
export class SavedPoiDialog implements OnInit {
    // Inputs for Embedded Mode (Desktop)
    @Input() item?: POIModel;
    @Input() displayName?: string;

    // Outputs for Embedded Mode (Desktop)
    @Output() closeEvent = new EventEmitter<void>();
    @Output() actionEvent = new EventEmitter<string>();

    // Unified data object for the template to use
    public displayData!: SavedItemDialogData;
    public snackBar = inject(MatSnackBar);

    isEditing: WritableSignal<Boolean> = signal(false);
    isDeleting: WritableSignal<Boolean> = signal(false);
    editForm!: FormGroup;

    private fb = inject(FormBuilder);
    private poiService = inject(POIService);
    // Public para pasarlo al DeleteConfirmationPopupComponent
    public auth = inject(Auth);

    constructor(
        @Optional() public dialogRef: MatDialogRef<SavedPoiDialog>,
        @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: SavedItemDialogData
    ) {
    }

    ngOnInit(): void {
        this.updateDisplayData();
    }

    // Detect changes if inputs change while component is open (Desktop)
    ngOnChanges(): void {
        this.updateDisplayData();
        if (this.isEditing() && this.editForm) this.initForm();
    }

    updateDisplayData(): void {
        // Determine if we are using Input (Desktop) or DialogData (Mobile)
        if (this.dialogData) {
            this.displayData = this.dialogData;
        } else if (this.item && this.displayName) {
            this.displayData = {
                item: this.item,
                displayName: this.displayName
            };
        }
    }

    close(): void {
        if (this.dialogRef) {
            this.dialogRef.close();
        } else {
            this.closeEvent.emit();
        }
    }

    // Unified Action Handler
    handleAction(action: string): void {
        if (this.dialogRef && action !== 'edit') {
            this.dialogRef.close(action);
        } else {
            this.actionEvent.emit(action);
        }
    }

    onRouteFromHere(): void {
        this.handleAction('route-from');
    }

    onRouteToHere(): void {
        this.handleAction('route-to');
    }

    onShowOnMap(): void {
        this.handleAction('showOnMap');
    }

    // ---- Edit Mode ----

    onEdit(): void {
        this.isEditing.set(true);
        this.initForm();
    }

    onCancelEdit(): void {
        this.isEditing.set(false);
        this.editForm.reset();
    }

    initForm(): void {
        this.editForm = this.fb.group({
            alias: [this.displayData.item.alias || '',],
            description: [this.displayData.item.description || '', [Validators.maxLength(150)]]
        });
    }

    clearField(fieldName: string): void {
        this.editForm.patchValue({[fieldName]: ''});
    }

    get descriptionLength(): number {
        return this.editForm.get('description')?.value?.length || 0;
    }

    async onSaveEdit(): Promise<void> {
        if (this.editForm.valid && this.displayData.item && this.auth) {
            const updatedData: Partial<POIModel> = {
                alias: this.editForm.value.alias,
                description: this.editForm.value.description,
            };

            try {
                // Call the service
                const success = await this.poiService.updatePOI(this.displayData.item.geohash, updatedData);
                if (success) {
                    // Update local data
                    this.displayData.item.alias = updatedData.alias;
                    this.displayData.item.description = updatedData.description;

                    // Update display name
                    if (updatedData.alias) {
                        this.displayData.displayName = updatedData.alias;
                    } else {
                        this.displayData.displayName = this.displayData.item.placeName;
                    }
                    this.handleAction('update');

                    this.snackBar.open('Cambios guardados', 'Ok',
                        {
                            duration: 3000,
                            horizontalPosition: 'start',
                            verticalPosition: 'bottom'
                        });
                    this.isEditing.set(false);

                } else {
                    this.snackBar.open('Error al guardar', 'Ok',
                        {
                            duration: 3000,
                            horizontalPosition: 'start',
                            verticalPosition: 'bottom'
                        });
                }
            } catch (error) {
                console.error(error);
                this.snackBar.open('Error al guardar', 'Ok',
                    {
                        duration: 3000,
                        horizontalPosition: 'start',
                        verticalPosition: 'bottom'
                    });
            }
        }
    }

    // -- BORRADO --

    onDelete(): void {
        this.isDeleting.set(true);
    }

    onCancelDelete(): void {
        this.isDeleting.set(false);
    }

    onDeleteSuccess(success: boolean): void {
        this.isDeleting.set(false);
        if (success) {
            this.snackBar.open(`Punto de interés "${this.displayData.displayName}" eliminado`, 'Ok', {
                duration: 3000,
                horizontalPosition: 'left',
                verticalPosition: 'bottom'
            });
            this.handleAction('delete');
        } else {
            this.snackBar.open('Error al eliminar', 'Ok', {
                duration: 3000,
                horizontalPosition: 'left',
                verticalPosition: 'bottom'
            });
        }
    }

}
