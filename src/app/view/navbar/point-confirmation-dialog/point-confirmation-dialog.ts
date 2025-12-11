import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {POISearchModel} from '../../../data/POISearchModel';

@Component({
    selector: 'app-point-confirmation-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    templateUrl: 'point-confirmation-dialog.html',
    styleUrl: 'point-confirmation-dialog.scss'
})
export class PointConfirmationDialog {
    private dialogRef = inject(MatDialogRef<PointConfirmationDialog>);
    public data = inject<POISearchModel>(MAT_DIALOG_DATA);

    confirm(): void {
        this.dialogRef.close(true);
    }

    cancel(): void {
        this.dialogRef.close(false);
    }
}
