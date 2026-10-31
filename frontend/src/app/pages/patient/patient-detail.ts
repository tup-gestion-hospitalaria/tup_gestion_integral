import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { patientDisplayName } from '../../core/validators/patient-validators';
import { Patient } from '../../models/patient';
import { PatientService } from '../../services/patient.service';
import { UserService } from '../../services/user.service';
import { PatientDeleteDialog, PatientDeleteDialogData } from './patient-delete-dialog';
import { PatientToast } from './patient-toast';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatProgressSpinnerModule,
    MatDialogModule,
    TranslateModule,
    PatientToast,
  ],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-ficha.css',
})
export class PatientDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly patientService = inject(PatientService);
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  @ViewChild(PatientToast) toast!: PatientToast;

  patient: Patient | null = null;
  isLoading = true;
  isDeleting = false;
  errorMessageKey = '';
  isAdmin = false;

  displayName(patient: Patient): string {
    return patientDisplayName(patient.fullName, patient.lastName);
  }

  contactPreferenceLabel(value: string | null | undefined): string {
    switch (value) {
      case 'call':
        return 'PATIENT.CONTACT_PREFERENCE_CALL';
      case 'whatsapp':
        return 'PATIENT.CONTACT_PREFERENCE_WHATSAPP';
      case 'email':
        return 'PATIENT.CONTACT_PREFERENCE_EMAIL';
      default:
        return 'PATIENT.CONTACT_PREFERENCE_NONE';
    }
  }

  ngOnInit(): void {
    this.userService.getMe().subscribe({
      next: (profile) => {
        this.isAdmin = profile.role === 'admin';
      },
      error: () => {
        this.isAdmin = false;
      },
    });

    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.patientService.getPatient(id).subscribe({
      next: (patient) => {
        this.patient = patient;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        if (error.status === 404) {
          this.errorMessageKey = 'PATIENT.NOT_FOUND';
        } else if (error.status === 401) {
          this.errorMessageKey = 'ITEMS.AUTH_ERROR';
        } else if (error.status === 403) {
          this.errorMessageKey = 'ITEMS.PERMISSION_ERROR';
        } else {
          this.errorMessageKey = 'PATIENT.LOAD_ERROR';
        }
      },
    });
  }

  referPatient(): void {
    if (!this.patient) {
      return;
    }
    this.router.navigate(['/centros-derivacion'], { state: { patient: this.patient } });
  }

  editPatient(): void {
    if (!this.patient) {
      return;
    }
    this.router.navigate(['/items', this.patient.id, 'editar']);
  }

  deactivatePatient(): void {
    if (!this.patient) {
      return;
    }

    const dialogRef = this.dialog.open(PatientDeleteDialog, {
      data: { fullName: this.displayName(this.patient) } satisfies PatientDeleteDialogData,
      panelClass: 'patient-delete-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed || !this.patient) {
        return;
      }

      const version = this.patient.version ?? 1;
      this.isDeleting = true;

      this.patientService.deactivatePatient(this.patient.id, version).subscribe({
        next: () => {
          this.isDeleting = false;
          this.toast.show(this.translate.instant('PATIENT.DEACTIVATE_SUCCESS'), 'ok');
          setTimeout(() => {
            this.router.navigate(['/items']);
          }, 800);
        },
        error: (error: HttpErrorResponse) => {
          this.isDeleting = false;
          if (error.status === 409) {
            this.toast.show(
              error.error?.message ?? this.translate.instant('PATIENT.VERSION_CONFLICT'),
              'err',
            );
            this.reloadPatient();
            return;
          }
          this.toast.show(this.translate.instant('PATIENT.DEACTIVATE_ERROR'), 'err');
        },
      });
    });
  }

  private reloadPatient(): void {
    if (!this.patient) {
      return;
    }
    this.patientService.getPatient(this.patient.id).subscribe({
      next: (patient) => {
        this.patient = patient;
      },
    });
  }
}
