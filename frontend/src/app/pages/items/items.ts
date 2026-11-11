import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

import { patientDisplayName } from '../../core/validators/patient-validators';
import { Patient } from '../../models/patient';
import { PatientService } from '../../services/patient.service';
import { UserService } from '../../services/user.service';
import { TranslateModule } from '@ngx-translate/core';

import { UiState } from '../../shared/ui-state';
import { httpErrorMessageKey } from '../../core/http-error-message';

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
    TranslateModule,
    UiState,
  ],
  templateUrl: './items.html',
  styleUrl: './items.css',
})
export class Items implements OnInit, OnDestroy {
  private readonly patientService = inject(PatientService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  patients: Patient[] = [];
  isAdmin = false;

  filterText = '';
  sortField: 'fullName' | 'email' | 'city' | 'country' = 'fullName';
  sortDirection: 'asc' | 'desc' = 'asc';
  activeFilter: 'all' | 'active' | 'inactive' = 'all';

  page = 1;
  limit = 20;
  total = 0;
  totalPages = 0;

  isLoading = true;
  errorMessage = '';

  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.userService.getMe().subscribe({
      next: (profile) => {
        this.isAdmin = profile.role === 'admin';
      },
      error: () => {
        this.isAdmin = false;
      },
    });
    this.loadPatients();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }
  }

  onSearchInput(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }

    this.searchDebounceId = setTimeout(() => {
      this.page = 1;
      this.loadPatients();
    }, 300);
  }

  onSortChange(): void {
    this.page = 1;
    this.loadPatients();
  }

  onActiveFilterChange(): void {
    this.page = 1;
    this.loadPatients();
  }

  goToPreviousPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.loadPatients();
    }
  }

  goToNextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
      this.loadPatients();
    }
  }

  private loadPatients(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const query = this.filterText.trim();
    const params = {
      page: this.page,
      limit: this.limit,
      sort: this.sortField,
      order: this.sortDirection,
      ...(query ? { q: query } : {}),
      ...(this.activeFilter === 'active' ? { active: true } : {}),
      ...(this.activeFilter === 'inactive' ? { active: false } : {}),
    };

    this.patientService.getPatients(params).subscribe({
      next: (page) => {
        this.patients = page.items;
        this.page = page.page;
        this.limit = page.limit;
        this.total = page.total;
        this.totalPages = page.totalPages;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = httpErrorMessageKey(error, 'items');
        this.isLoading = false;
      },
    });
  }

  referPatient(patient: Patient, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/pacientes', patient.id, 'derivar']);
  }

  openPatient(patient: Patient): void {
    this.router.navigate(['/pacientes', patient.id]);
  }

  displayName(patient: Patient): string {
    return patientDisplayName(patient.fullName, patient.lastName);
  }

  createPatient(): void {
    this.router.navigate(['/items/nuevo']);
  }
}
