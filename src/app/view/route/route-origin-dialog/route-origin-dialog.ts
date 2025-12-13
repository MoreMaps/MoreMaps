import { Component, inject } from '@angular/core';
import {MatDialogRef, MatDialogModule, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {MatProgressBar} from '@angular/material/progress-bar';

export type RouteOriginMethod = 'saved' | 'search' | 'BACK' | null;

@Component({
    selector: 'app-route-origin-dialog',
    standalone: true,
    imports: [MatDialogModule, MatIconModule, MatButtonModule, MatProgressBar],
    templateUrl: './route-origin-dialog.html',
    styleUrls: ['./route-origin-dialog.scss']
})
export class RouteOriginDialog {
    private dialogRef = inject(MatDialogRef<RouteOriginDialog>);

    public data: any = inject(MAT_DIALOG_DATA);

    closeWithAction(action: RouteOriginMethod): void {
        this.dialogRef.close(action);
    }
}
