import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { httpErrorMessageKey } from '../../core/http-error-message';
import { patientDisplayName } from '../../core/validators/patient-validators';
import { Patient } from '../../models/patient';
import { Referral, ReferralEvent, ReferralStatus } from '../../models/referral';
import { UserProfile } from '../../models/user';
import { PatientService } from '../../services/patient.service';
import { ReferralService } from '../../services/referral.service';
import { UserService } from '../../services/user.service';
import { UiState } from '../../shared/ui-state';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-referral-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, UiState],
  templateUrl: './referral-detail.html',
  styleUrl: './referral-flow.css',
})
export class ReferralDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly referralService = inject(ReferralService);
  private readonly patientService = inject(PatientService);
  private readonly userService = inject(UserService);
  private readonly translate = inject(TranslateService);

  referral: Referral | null = null;
  patient: Patient | null = null;
  profile: UserProfile | null = null;
  isLoading = true;
  isTransitioning = false;
  errorMessageKey = '';
  feedbackMessageKey = '';
  feedbackParams: Record<string, string> = {};
  showRejectionInput = false;
  rejectionReason = '';

  ngOnInit(): void {
    this.feedbackMessageKey =
      this.route.snapshot.queryParamMap.get('created') === '1' ? 'REFERRAL.CREATED_SUCCESS' : '';

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
      : this.translate.instant('COMMON.USER_FALLBACK');
  }

  statusLabel(status: ReferralStatus): string {
    const keys: Record<ReferralStatus, string> = {
      draft: 'REFERRAL.STATUS_DRAFT',
      submitted: 'REFERRAL.STATUS_SUBMITTED',
      accepted: 'REFERRAL.STATUS_ACCEPTED',
      rejected: 'REFERRAL.STATUS_REJECTED',
      completed: 'REFERRAL.STATUS_COMPLETED',
      cancelled: 'REFERRAL.STATUS_CANCELLED',
    };
    return this.translate.instant(keys[status]);
  }

  priorityLabel(): string {
    if (!this.referral) return '';
    const keys: Record<Referral['priority'], string> = {
      low: 'REFERRAL.PRIORITY_LOW',
      normal: 'REFERRAL.PRIORITY_NORMAL',
      high: 'REFERRAL.PRIORITY_HIGH',
      urgent: 'REFERRAL.PRIORITY_URGENT',
    };
    return this.translate.instant(keys[this.referral.priority]);
  }

  transitionLabel(status: ReferralStatus): string {
    const keys: Record<ReferralStatus, string> = {
      draft: 'REFERRAL.TRANSITION_DRAFT',
      submitted: 'REFERRAL.TRANSITION_SUBMITTED',
      accepted: 'REFERRAL.TRANSITION_ACCEPTED',
      rejected: 'REFERRAL.TRANSITION_REJECTED',
      completed: 'REFERRAL.TRANSITION_COMPLETED',
      cancelled: 'REFERRAL.TRANSITION_CANCELLED',
    };
    return this.translate.instant(keys[status]);
  }

  eventLabel(event: ReferralEvent): string {
    const labels: Record<string, string> = {
      'referral.created': 'REFERRAL.EVENT_CREATED',
      'referral.updated': 'REFERRAL.EVENT_UPDATED',
      'referral.submitted': 'REFERRAL.EVENT_SUBMITTED',
      'referral.accepted': 'REFERRAL.EVENT_ACCEPTED',
      'referral.rejected': 'REFERRAL.EVENT_REJECTED',
      'referral.completed': 'REFERRAL.EVENT_COMPLETED',
      'referral.cancelled': 'REFERRAL.EVENT_CANCELLED',
    };
    const key = labels[event.action];
    return key ? this.translate.instant(key) : event.action;
  }

  startTransition(status: ReferralStatus): void {
    if (status === 'rejected') {
      this.showRejectionInput = true;
      this.feedbackMessageKey = '';
      return;
    }
    this.runTransition(status);
  }

  confirmRejection(): void {
    const reason = this.rejectionReason.trim();
    if (!reason) {
      this.feedbackMessageKey = 'REFERRAL.REJECTION_REQUIRED';
      return;
    }
    this.runTransition('rejected', reason);
  }

  private loadReferral(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) {
      this.errorMessageKey = 'REFERRAL.NO_REFERRAL_ID';
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
        if (error.status === 404) {
          this.errorMessageKey = 'REFERRAL.NOT_FOUND';
        } else if (error.status === 403) {
          this.errorMessageKey = 'REFERRAL.PERMISSION_ERROR';
        } else {
          this.errorMessageKey = httpErrorMessageKey(error, 'referral');
        }
        this.isLoading = false;
      },
    });
  }

  private runTransition(status: ReferralStatus, rejectionReason?: string): void {
    if (!this.referral || this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.feedbackMessageKey = 'REFERRAL.UPDATING_STATUS';
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
          this.feedbackParams = { status: this.statusLabel(status).toLowerCase() };
          this.feedbackMessageKey = 'REFERRAL.STATUS_UPDATED';
          this.loadReferral();
        },
        error: (error: HttpErrorResponse) => {
          this.isTransitioning = false;
          this.feedbackMessageKey = httpErrorMessageKey(error, 'referralTransition');
        },
      });
  }
}
