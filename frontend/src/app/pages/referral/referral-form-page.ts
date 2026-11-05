import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';

import { patientDisplayName } from '../../core/validators/patient-validators';
import { Healthsite } from '../../models/healthsite';
import { Patient } from '../../models/patient';
import { ReferralCreatePayload, ReferralPriority } from '../../models/referral';
import { ItemsService } from '../../services/items.service';
import { PatientService } from '../../services/patient.service';
import { ReferralService } from '../../services/referral.service';

@Component({
  selector: 'app-referral-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
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
  errorMessage = '';
  feedbackMessage = '';

  private idempotencyKey = this.createIdempotencyKey();

  ngOnInit(): void {
    const patientId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!patientId) {
      this.errorMessage = 'No se indicó el paciente a derivar.';
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
          this.errorMessage = 'No hay centros disponibles para crear la derivación.';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.status === 404
            ? 'Paciente no encontrado.'
            : 'No se pudieron cargar los datos para la derivación.';
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
      this.feedbackMessage = 'Revisá los campos marcados antes de continuar.';
      return;
    }

    const value = this.form.getRawValue();
    const healthsite = this.healthsites.find((item) => item.id === value.healthsiteId);
    if (!healthsite) {
      this.feedbackMessage = 'Seleccioná un centro de derivación válido.';
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
    this.feedbackMessage = 'Guardando la derivación…';
    this.referralService.create(payload, this.idempotencyKey).subscribe({
      next: (referral) => {
        this.feedbackMessage = 'Derivación creada. Abriendo el detalle…';
        void this.router.navigate(['/derivaciones', referral.id], {
          queryParams: { created: '1' },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.feedbackMessage =
          error.error?.message ?? 'No se pudo crear la derivación. Intentá nuevamente.';
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
