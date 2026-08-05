import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Patient } from '../../models/patient';
import { PatientService } from '../../services/patient.service';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { PatientDialog, PatientFormData } from '../patient-dialog/patient-dialog';

@Component({
  selector: 'app-items',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDialogModule,
    TranslateModule,
  ],
  templateUrl: './items.html',
  styleUrl: './items.css',
})
export class Items implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  readonly authService = inject(AuthService);

  patients: Patient[] = [];
  filteredPatients: Patient[] = [];

  filterText = '';
  sortField: 'fullName' | 'email' | 'city' | 'country' = 'fullName';
  sortDirection: 'asc' | 'desc' = 'asc';

  isLoading = true;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadPatients();
  }

  private loadPatients(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.patientService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.filteredPatients = [...this.patients];
        this.sortPatients();
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.getErrorMessage(error);
        this.isLoading = false;
      },
    });
  }

  onFilterChange(): void {
    const text = this.filterText.toLowerCase().trim();

    this.filteredPatients = this.patients.filter((patient) => {
      return (
        patient.fullName.toLowerCase().includes(text) ||
        patient.email.toLowerCase().includes(text) ||
        patient.city.toLowerCase().includes(text) ||
        patient.country.toLowerCase().includes(text)
      );
    });

    this.sortPatients();
  }

  sortPatients(): void {
    this.filteredPatients.sort((a, b) => {
      const valueA = this.getSortValue(a);
      const valueB = this.getSortValue(b);

      const result = valueA.localeCompare(valueB);

      return this.sortDirection === 'asc' ? result : -result;
    });
  }

  referPatient(patient: Patient): void {
    this.router.navigate(['/centros-derivacion'], {
      state: { patient },
    });
  }

  createPatient(): void {
    this.dialog
      .open<PatientDialog, Patient | null, PatientFormData>(PatientDialog, {
        width: '42rem',
        maxWidth: '95vw',
        data: null,
      })
      .afterClosed()
      .subscribe((patient) => {
        if (!patient) {
          return;
        }

        this.patientService.createPatient(patient).subscribe({
          next: () => {
            this.successMessage = 'Paciente creado correctamente.';
            this.loadPatients();
          },
          error: (error: HttpErrorResponse) => {
            this.errorMessage = this.getErrorMessage(error);
          },
        });
      });
  }

  editPatient(patient: Patient): void {
    this.dialog
      .open<PatientDialog, Patient, PatientFormData>(PatientDialog, {
        width: '42rem',
        maxWidth: '95vw',
        data: patient,
      })
      .afterClosed()
      .subscribe((changes) => {
        if (!changes) {
          return;
        }

        this.patientService
          .replacePatient(patient.id, {
            ...changes,
            ...(patient.healthsite ? { healthsite: patient.healthsite } : {}),
          })
          .subscribe({
            next: () => {
              this.successMessage = 'Paciente actualizado correctamente.';
              this.loadPatients();
            },
            error: (error: HttpErrorResponse) => {
              this.errorMessage = this.getErrorMessage(error);
            },
          });
      });
  }

  deletePatient(patient: Patient): void {
    if (!confirm(`¿Eliminar a ${patient.fullName}?`)) {
      return;
    }

    this.patientService.deletePatient(patient.id).subscribe({
      next: () => {
        this.successMessage = 'Paciente eliminado correctamente.';
        this.loadPatients();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.getErrorMessage(error);
      },
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401) {
      return 'Tu sesión venció. Volvé a iniciar sesión.';
    }

    if (error.status === 403) {
      return 'No tenés permisos para realizar esta operación.';
    }

    return error.error?.message ?? 'No se pudo completar la operación.';
  }

  private getSortValue(patient: Patient): string {
    return patient[this.sortField].toLowerCase();
  }
}
