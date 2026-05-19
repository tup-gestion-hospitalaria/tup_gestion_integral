import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Patient } from '../../models/patient';
import { Healthsite } from '../../models/healthsite';
import { ItemsService } from '../../services/items.service';

@Component({
  selector: 'app-referral-centers',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './referral-centers.html',
  styleUrl: './referral-centers.css'
})
export class ReferralCenters implements OnInit {
  private readonly itemsService = inject(ItemsService);

  selectedPatient: Patient | null = null;

  healthsites: Healthsite[] = [];
  filteredHealthsites: Healthsite[] = [];

  filterText = '';
  selectedType = 'all';
  selectedCity = 'all';

  availableTypes: string[] = [];
  availableCities: string[] = [];

  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.selectedPatient = history.state.patient ?? null;

    this.loadHealthsites();
  }

  private loadHealthsites(): void {
    this.itemsService.getHealthsites().subscribe({
      next: (healthsites) => {
        this.healthsites = healthsites;

        this.availableTypes = [
          ...new Set(
            healthsites
              .map(healthsite => healthsite.type)
              .filter(type => type)
          )
        ].sort();

        this.availableCities = [
          ...new Set(
            healthsites
              .map(healthsite => healthsite.city)
              .filter(city => city)
          )
        ].sort();

        this.applyFilters();

        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los centros de derivación.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const text = this.filterText.toLowerCase().trim();

    this.filteredHealthsites = this.healthsites.filter(healthsite => {

      const matchesText =
        healthsite.name.toLowerCase().includes(text) ||
        healthsite.city.toLowerCase().includes(text) ||
        healthsite.address.toLowerCase().includes(text);

      const matchesType =
        this.selectedType === 'all' ||
        healthsite.type === this.selectedType;

      const matchesCity =
        this.selectedCity === 'all' ||
        healthsite.city === this.selectedCity;

      return matchesText && matchesType && matchesCity;
    });
  }

  referToHealthsite(healthsite: Healthsite): void {
    if (!this.selectedPatient) {
      return;
    }

    this.selectedPatient.healthsite = healthsite;

    alert(
      `${this.selectedPatient.fullName} fue derivado a ${healthsite.name}`
    );
  }

  translateType(type: string): string {

    const translations: Record<string, string> = {
      pharmacy: 'Farmacia',
      clinic: 'Clínica',
      hospital: 'Hospital',
      doctors: 'Consultorio médico',
      dentist: 'Odontología',
      laboratory: 'Laboratorio',
      healthcare: 'Centro de salud'
    };

    return translations[type.toLowerCase()] ?? type;
  }
}