import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Patient } from '../../models/patient';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-items',
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './items.html',
  styleUrl: './items.css'
})
export class Items implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);

  patients: Patient[] = [];
  filteredPatients: Patient[] = [];

  filterText = '';
  sortField: 'fullName' | 'email' | 'city' | 'country' = 'fullName';
  sortDirection: 'asc' | 'desc' = 'asc';

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPatients();
  }

  private loadPatients(): void {
    this.patientService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.filteredPatients = [...this.patients];
        this.sortPatients();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los pacientes.';
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    const text = this.filterText.toLowerCase().trim();

    this.filteredPatients = this.patients.filter(patient => {
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
      state: { patient }
    });
  }

  private getSortValue(patient: Patient): string {
    return patient[this.sortField].toLowerCase();
  }
}