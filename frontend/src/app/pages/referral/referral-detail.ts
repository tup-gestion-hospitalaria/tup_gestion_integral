import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { patientDisplayName } from '../../core/validators/patient-validators';
import { Patient } from '../../models/patient';
import { Referral, ReferralEvent, ReferralStatus } from '../../models/referral';
import { UserProfile } from '../../models/user';
import { PatientService } from '../../services/patient.service';
import { ReferralService } from '../../services/referral.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-referral-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './referral-detail.html',
  styleUrl: './referral-flow.css',
})
export class ReferralDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly referralService = inject(ReferralService);
  private readonly patientService = inject(PatientService);
  private readonly userService = inject(UserService);

  referral: Referral | null = null;
  patient: Patient | null = null;
  profile: UserProfile | null = null;
  isLoading = true;
  isTransitioning = false;
  errorMessage = '';
  feedbackMessage = '';
  showRejectionInput = false;
  rejectionReason = '';

  ngOnInit(): void {
    this.feedbackMessage =
      this.route.snapshot.queryParamMap.get('created') === '1'
        ? 'Derivación creada correctamente.'
        : '';

    this.userService.getMe().subscribe({
      next: (profile) => (this.profile = profile),
      error: () => (this.profile = null),
    });
    this.loadReferral();
  }

  get history(): ReferralEvent[] {
    return [...(this.referral?.history ?? [])].sort((left, right) =>
      left.at.localeCompare(right.at),
    );
  }

  get allowedTransitions(): ReferralStatus[] {
    if (!this.referral || !this.profile) {
      return [];
    }

    const owner = this.referral.createdBy === this.profile.uid;
    if (this.profile.role === 'admin') {
      const adminTransitions: Partial<Record<ReferralStatus, ReferralStatus[]>> = {
        draft: ['submitted', 'cancelled'],
        submitted: ['accepted', 'rejected', 'cancelled'],
        accepted: ['completed', 'cancelled'],
      };
      return adminTransitions[this.referral.status] ?? [];
    }

    if (!owner) {
      return [];
    }
    const ownerTransitions: Partial<Record<ReferralStatus, ReferralStatus[]>> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['cancelled'],
      accepted: ['cancelled'],
    };
    return ownerTransitions[this.referral.status] ?? [];
  }

  patientName(): string {
    return this.patient
      ? patientDisplayName(this.patient.fullName, this.patient.lastName)
      : 'Paciente';
  }

  statusLabel(status: ReferralStatus): string {
    return {
      draft: 'Borrador',
      submitted: 'Enviada',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      completed: 'Completada',
      cancelled: 'Cancelada',
    }[status];
  }

  priorityLabel(): string {
    if (!this.referral) return '';
    return { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' }[
      this.referral.priority
    ];
  }

  transitionLabel(status: ReferralStatus): string {
    return {
      draft: 'Volver a borrador',
      submitted: 'Enviar',
      accepted: 'Aceptar',
      rejected: 'Rechazar',
      completed: 'Completar',
      cancelled: 'Cancelar derivación',
    }[status];
  }

  eventLabel(event: ReferralEvent): string {
    const labels: Record<string, string> = {
      'referral.created': 'Derivación creada',
      'referral.updated': 'Borrador actualizado',
      'referral.submitted': 'Derivación enviada',
      'referral.accepted': 'Derivación aceptada',
      'referral.rejected': 'Derivación rechazada',
      'referral.completed': 'Derivación completada',
      'referral.cancelled': 'Derivación cancelada',
    };
    return labels[event.action] ?? event.action;
  }

  startTransition(status: ReferralStatus): void {
    if (status === 'rejected') {
      this.showRejectionInput = true;
      this.feedbackMessage = '';
      return;
    }
    this.runTransition(status);
  }

  confirmRejection(): void {
    const reason = this.rejectionReason.trim();
    if (!reason) {
      this.feedbackMessage = 'Ingresá el motivo del rechazo.';
      return;
    }
    this.runTransition('rejected', reason);
  }

  private loadReferral(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) {
      this.errorMessage = 'No se indicó la derivación.';
      this.isLoading = false;
      return;
    }

    this.referralService.getById(id).subscribe({
      next: (referral) => {
        this.referral = referral;
        this.isLoading = false;
        this.patientService.getPatient(referral.patientId).subscribe({
          next: (patient) => (this.patient = patient),
          error: () => (this.patient = null),
        });
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.status === 404
            ? 'Derivación no encontrada.'
            : error.status === 403
              ? 'No tenés permisos para ver esta derivación.'
              : 'No se pudo cargar la derivación.';
        this.isLoading = false;
      },
    });
  }

  private runTransition(status: ReferralStatus, rejectionReason?: string): void {
    if (!this.referral || this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.feedbackMessage = 'Actualizando estado…';
    this.referralService
      .transition(this.referral.id, {
        to: status,
        ...(rejectionReason ? { rejectionReason } : {}),
      })
      .subscribe({
        next: () => {
          this.isTransitioning = false;
          this.showRejectionInput = false;
          this.rejectionReason = '';
          this.feedbackMessage = `Estado actualizado a ${this.statusLabel(status).toLowerCase()}.`;
          this.loadReferral();
        },
        error: (error: HttpErrorResponse) => {
          this.isTransitioning = false;
          this.feedbackMessage =
            error.error?.message ?? 'No se pudo actualizar el estado de la derivación.';
        },
      });
  }
}
