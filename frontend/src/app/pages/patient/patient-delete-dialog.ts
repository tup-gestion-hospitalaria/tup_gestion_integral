import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

export interface PatientDeleteDialogData {
  fullName: string;
}

@Component({
  selector: 'app-patient-delete-dialog',
  standalone: true,
  imports: [MatDialogModule, TranslateModule],
  templateUrl: './patient-delete-dialog.html',
  styleUrl: './patient-ficha.css',
})
export class PatientDeleteDialog {
  readonly data = inject<PatientDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PatientDeleteDialog>);

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
