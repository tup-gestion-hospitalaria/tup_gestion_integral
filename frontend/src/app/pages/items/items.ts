import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Patient } from '../../models/patient';
import { Healthsite } from '../../models/healthsite';
import { PatientService } from '../../services/patient.service';
import { ItemsService } from '../../services/items.service';

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
  private readonly itemsService = inject(ItemsService);

  patients: Patient[] = [];
  filteredPatients: Patient[] = [];

  filterText = '';
  sortField: 'fullName' | 'email' | 'city' | 'country' | 'healthsite' = 'fullName';
  sortDirection: 'asc' | 'desc' = 'asc';

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPatientsWithHealthsites();
  }

  private loadPatientsWithHealthsites(): void {
    forkJoin({
      patients: this.patientService.getPatients(),
      healthsites: this.itemsService.getHealthsites()
    }).subscribe({
      next: ({ patients, healthsites }) => {
        this.patients = this.assignHealthsitesToPatients(patients, healthsites);
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

  private assignHealthsitesToPatients(
    patients: Patient[],
    healthsites: Healthsite[]
  ): Patient[] {
    if (healthsites.length === 0) {
      return patients;
    }

    return patients.map((patient, index) => ({
      ...patient,
      healthsite: healthsites[index % healthsites.length]
    }));
  }

onFilterChange(): void {
  const text = this.filterText.toLowerCase().trim();

  this.filteredPatients = this.patients.filter(patient => {
    const healthsiteName = patient.healthsite?.name?.toLowerCase() ?? '';
    const healthsiteCity = patient.healthsite?.city?.toLowerCase() ?? '';
    const healthsiteAddress = patient.healthsite?.address?.toLowerCase() ?? '';
    const healthsiteType = patient.healthsite?.type?.toLowerCase() ?? '';

    return (
      patient.fullName.toLowerCase().includes(text) ||
      patient.email.toLowerCase().includes(text) ||
      patient.city.toLowerCase().includes(text) ||
      patient.country.toLowerCase().includes(text) ||
      healthsiteName.includes(text) ||
      healthsiteCity.includes(text) ||
      healthsiteAddress.includes(text) ||
      healthsiteType.includes(text)
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

  private getSortValue(patient: Patient): string {
    if (this.sortField === 'healthsite') {
      return patient.healthsite?.name?.toLowerCase() ?? '';
    }

    return patient[this.sortField].toLowerCase();
  }
}
