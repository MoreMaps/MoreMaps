import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export type AddPoiMethod = 'coords' | 'name' | null;

@Component({
    selector: 'app-add-poi-dialog',
    standalone: true,
    imports: [MatDialogModule, MatIconModule, MatButtonModule],
    templateUrl: './add-poi-dialog.html',
    styleUrl: './add-poi-dialog.scss'
})
export class AddPoiDialogComponent {
    private dialogRef = inject(MatDialogRef<AddPoiDialogComponent>);

    selectMethod(method: AddPoiMethod): void {
        this.dialogRef.close(method);
    }
}
