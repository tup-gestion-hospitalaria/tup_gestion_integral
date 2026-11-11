import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { httpErrorMessageKey } from '../../core/http-error-message';
import { patientDisplayName } from '../../core/validators/patient-validators';
import { Healthsite } from '../../models/healthsite';
import { Patient } from '../../models/patient';
import { ReferralCreatePayload, ReferralPriority } from '../../models/referral';
import { ItemsService } from '../../services/items.service';
import { PatientService } from '../../services/patient.service';
import { ReferralService } from '../../services/referral.service';
import { UiState } from '../../shared/ui-state';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-referral-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, UiState],
  templateUrl: './referral-form-page.html',
  styleUrl: './referral-flow.css',
})
export class ReferralFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly itemsService = inject(ItemsService);
  private readonly referralService = inject(ReferralService);
  private readonly translate = inject(TranslateService);

  readonly form = this.formBuilder.nonNullable.group({
    healthsiteId: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    priority: ['normal' as ReferralPriority, Validators.required],
    notes: ['', Validators.maxLength(2000)],
  });

  patient: Patient | null = null;
  healthsites: Healthsite[] = [];
  isLoading = true;
  isSubmitting = false;
  errorMessageKey = '';
  feedbackMessageKey = '';

  private idempotencyKey = this.createIdempotencyKey();

  ngOnInit(): void {
    const patientId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!patientId) {
      this.errorMessageKey = 'REFERRAL.NO_PATIENT_ID';
      this.isLoading = false;
      return;
    }

    forkJoin({
      patient: this.patientService.getPatient(patientId),
      healthsites: this.itemsService.getHealthsites(),
    }).subscribe({
      next: ({ patient, healthsites }) => {
        this.patient = patient;
        this.healthsites = healthsites;
        this.isLoading = false;
        if (!healthsites.length) {
          this.errorMessageKey = 'REFERRAL.NO_HEALTHSITES';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessageKey =
          error.status === 404 ? 'PATIENT.NOT_FOUND' : httpErrorMessageKey(error, 'referralCreate');
        this.isLoading = false;
      },
    });
  }

  displayName(): string {
    return this.patient ? patientDisplayName(this.patient.fullName, this.patient.lastName) : '';
  }

  submit(): void {
    if (this.isSubmitting || !this.patient) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedbackMessageKey = 'REFERRAL.VALIDATION_SUMMARY';
      return;
    }

    const value = this.form.getRawValue();
    const healthsite = this.healthsites.find((item) => item.id === value.healthsiteId);
    if (!healthsite) {
      this.feedbackMessageKey = 'REFERRAL.HEALTHSITE_REQUIRED';
      return;
    }

    const payload: ReferralCreatePayload = {
      patientId: this.patient.id,
      destination: {
        healthsiteId: healthsite.id,
        name: healthsite.name,
        address: healthsite.address,
      },
      reason: value.reason.trim(),
      priority: value.priority,
      notes: value.notes.trim() || null,
    };

    this.isSubmitting = true;
    this.feedbackMessageKey = 'REFERRAL.SAVING';
    this.referralService.create(payload, this.idempotencyKey).subscribe({
      next: (referral) => {
        this.feedbackMessageKey = 'REFERRAL.CREATED_REDIRECT';
        void this.router.navigate(['/derivaciones', referral.id], {
          queryParams: { created: '1' },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.feedbackMessageKey = httpErrorMessageKey(error, 'referralCreate');
      },
    });
  }

  private createIdempotencyKey(): string {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    return `referral-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
