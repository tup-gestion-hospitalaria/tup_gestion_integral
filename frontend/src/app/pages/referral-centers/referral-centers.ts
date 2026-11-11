import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Healthsite } from '../../models/healthsite';
import { ItemsService } from '../../services/items.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UiState } from '../../shared/ui-state';
import { httpErrorMessageKey } from '../../core/http-error-message';

@Component({
  selector: 'app-referral-centers',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule,
    UiState,
  ],
  templateUrl: './referral-centers.html',
  styleUrl: './referral-centers.css',
})
export class ReferralCenters implements OnInit {
  private readonly itemsService = inject(ItemsService);
  private readonly translate = inject(TranslateService);

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
    this.loadHealthsites();
  }

  private loadHealthsites(): void {
    this.itemsService.getHealthsites().subscribe({
      next: (healthsites) => {
        this.healthsites = healthsites;

        this.availableTypes = [
          ...new Set(healthsites.map((healthsite) => healthsite.type).filter((type) => type)),
        ].sort();

        this.availableCities = [
          ...new Set(healthsites.map((healthsite) => healthsite.city).filter((city) => city)),
        ].sort();

        this.applyFilters();

        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = httpErrorMessageKey(error, 'referralCenters');
        this.isLoading = false;
      },
    });
  }

  applyFilters(): void {
    const text = this.filterText.toLowerCase().trim();

    this.filteredHealthsites = this.healthsites.filter((healthsite) => {
      const matchesText =
        healthsite.name.toLowerCase().includes(text) ||
        healthsite.city.toLowerCase().includes(text) ||
        healthsite.address.toLowerCase().includes(text);

      const matchesType = this.selectedType === 'all' || healthsite.type === this.selectedType;

      const matchesCity = this.selectedCity === 'all' || healthsite.city === this.selectedCity;

      return matchesText && matchesType && matchesCity;
    });
  }

  translateType(type: string): string {
    const keyByType: Record<string, string> = {
      pharmacy: 'REFERRAL_CENTERS.TYPE_PHARMACY',
      clinic: 'REFERRAL_CENTERS.TYPE_CLINIC',
      hospital: 'REFERRAL_CENTERS.TYPE_HOSPITAL',
      doctors: 'REFERRAL_CENTERS.TYPE_DOCTORS',
      dentist: 'REFERRAL_CENTERS.TYPE_DENTIST',
      laboratory: 'REFERRAL_CENTERS.TYPE_LABORATORY',
      healthcare: 'REFERRAL_CENTERS.TYPE_HEALTHCARE',
    };

    const key = keyByType[type.toLowerCase()];
    return key ? this.translate.instant(key) : type;
  }
}
