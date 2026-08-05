import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Patient } from '../../models/patient';

export type PatientFormData = Omit<Patient, 'id' | 'healthsite'>;

@Component({
  selector: 'app-patient-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './patient-dialog.html',
  styleUrl: './patient-dialog.css',
})
export class PatientDialog {
  patient: PatientFormData;
  errorMessage = '';

  constructor(
    private readonly dialogRef: MatDialogRef<PatientDialog, PatientFormData>,
    @Inject(MAT_DIALOG_DATA) public readonly data: Patient | null,
  ) {
    this.patient = {
      fullName: data?.fullName ?? '',
      email: data?.email ?? '',
      city: data?.city ?? '',
      country: data?.country ?? '',
      picture: data?.picture ?? '',
      active: data?.active ?? true,
    };
  }

  save(): void {
    const stringValues = [
      this.patient.fullName,
      this.patient.email,
      this.patient.city,
      this.patient.country,
      this.patient.picture,
    ];

    if (stringValues.some((value) => !value.trim())) {
      this.errorMessage = 'Completá todos los campos.';
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(this.patient.email)) {
      this.errorMessage = 'Ingresá un correo electrónico válido.';
      return;
    }

    this.dialogRef.close({
      ...this.patient,
      fullName: this.patient.fullName.trim(),
      email: this.patient.email.trim(),
      city: this.patient.city.trim(),
      country: this.patient.country.trim(),
      picture: this.patient.picture.trim(),
    });
  }
}
