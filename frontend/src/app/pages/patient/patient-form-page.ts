import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  normalizePatientFormValue,
  patientAffiliateNumberValidator,
  patientBirthDateValidator,
  patientContactPreferenceValidator,
  patientDocumentValidator,
  patientEmailValidator,
  patientFieldErrorKey,
  patientFullNameValidator,
  patientInsuranceNameValidator,
  patientLastNameValidator,
  patientOptionalTextValidator,
  patientPhoneValidator,
  patientPictureValidator,
  patientPlaceValidator,
} from '../../core/validators/patient-validators';
import { Patient } from '../../models/patient';
import { PatientService } from '../../services/patient.service';
import { PatientToast } from './patient-toast';

type FormMode = 'create' | 'edit';

@Component({
  selector: 'app-patient-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatProgressSpinnerModule,
    TranslateModule,
    PatientToast,
  ],
  templateUrl: './patient-form-page.html',
  styleUrl: './patient-ficha.css',
})
export class PatientFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly patientService = inject(PatientService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(PatientToast) toast!: PatientToast;

  mode: FormMode = 'create';
  patientId = '';
  loadedPatient: Patient | null = null;
  originalSnapshot = '';

  form: FormGroup = this.buildForm(true);
  touchedFields = new Set<string>();

  isLoading = false;
  isSaving = false;
  loadErrorKey = '';

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] as FormMode;

    this.form.controls['privateCare'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncInsuranceFields());

    if (this.mode === 'edit') {
      this.patientId = this.route.snapshot.paramMap.get('id') ?? '';
      this.loadPatient();
      return;
    }

    this.syncInsuranceFields();
    this.originalSnapshot = this.snapshotForm();
  }

  private buildForm(active: boolean): FormGroup {
    return this.fb.group({
      fullName: ['', [patientFullNameValidator()]],
      lastName: ['', [patientLastNameValidator()]],
      documentNumber: ['', [patientDocumentValidator()]],
      birthDate: ['', [patientBirthDateValidator()]],
      email: ['', [patientEmailValidator()]],
      phone: ['', [patientPhoneValidator()]],
      contactPreference: ['', [patientContactPreferenceValidator()]],
      contactHours: ['', [patientOptionalTextValidator()]],
      city: ['', [patientPlaceValidator()]],
      country: ['', [patientPlaceValidator()]],
      privateCare: [false],
      insuranceName: ['', [patientInsuranceNameValidator()]],
      affiliateNumber: ['', [patientAffiliateNumberValidator()]],
      plan: ['', [patientOptionalTextValidator()]],
      picture: ['', [patientPictureValidator()]],
      active: [active],
    });
  }

  private loadPatient(): void {
    if (!this.patientId) {
      this.loadErrorKey = 'PATIENT.NOT_FOUND';
      return;
    }

    this.isLoading = true;
    this.loadErrorKey = '';

    this.patientService.getPatient(this.patientId).subscribe({
      next: (patient) => {
        this.loadedPatient = patient;
        this.form.patchValue({
          fullName: patient.fullName,
          lastName: patient.lastName ?? '',
          documentNumber: patient.documentNumber ?? '',
          birthDate: patient.birthDate ?? '',
          email: patient.email,
          phone: patient.phone ?? '',
          contactPreference: patient.contactPreference ?? '',
          contactHours: patient.contactHours ?? '',
          city: patient.city,
          country: patient.country,
          privateCare: patient.privateCare === true,
          insuranceName: patient.insuranceName ?? '',
          affiliateNumber: patient.affiliateNumber ?? '',
          plan: patient.plan ?? '',
          picture: patient.picture,
          active: patient.active,
        });
        this.syncInsuranceFields();
        this.originalSnapshot = this.snapshotForm();
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        if (error.status === 404) {
          this.loadErrorKey = 'PATIENT.NOT_FOUND';
        } else if (error.status === 401) {
          this.loadErrorKey = 'ITEMS.AUTH_ERROR';
        } else if (error.status === 403) {
          this.loadErrorKey = 'ITEMS.PERMISSION_ERROR';
        } else {
          this.loadErrorKey = 'PATIENT.LOAD_ERROR';
        }
      },
    });
  }

  get insuranceFieldsDisabled(): boolean {
    return this.form.controls['privateCare'].value === true;
  }

  syncInsuranceFields(): void {
    const privateCare = this.form.controls['privateCare'].value === true;
    const insuranceName = this.form.controls['insuranceName'];
    const affiliateNumber = this.form.controls['affiliateNumber'];
    const plan = this.form.controls['plan'];

    if (privateCare) {
      insuranceName.setValue('', { emitEvent: false });
      affiliateNumber.setValue('', { emitEvent: false });
      plan.setValue('', { emitEvent: false });
      insuranceName.disable({ emitEvent: false });
      affiliateNumber.disable({ emitEvent: false });
      plan.disable({ emitEvent: false });
    } else {
      insuranceName.enable({ emitEvent: false });
      affiliateNumber.enable({ emitEvent: false });
      plan.enable({ emitEvent: false });
    }

    insuranceName.updateValueAndValidity({ emitEvent: false });
    affiliateNumber.updateValueAndValidity({ emitEvent: false });
    plan.updateValueAndValidity({ emitEvent: false });
  }

  showFieldError(controlName: string): boolean {
    const control = this.form.get(controlName);
    if (!control) {
      return false;
    }
    return this.touchedFields.has(controlName) && !!control.invalid;
  }

  fieldErrorKey(controlName: string): string | null {
    const control = this.form.get(controlName);
    if (!this.showFieldError(controlName)) {
      return null;
    }
    return patientFieldErrorKey(control?.errors ?? null);
  }

  isChanged(controlName: string): boolean {
    if (this.mode !== 'edit') {
      return false;
    }
    const current = this.form.getRawValue();
    const original = JSON.parse(this.originalSnapshot) as Record<string, unknown>;
    return current[controlName] !== original[controlName];
  }

  onBlur(controlName: string): void {
    this.touchedFields.add(controlName);
    const control = this.form.get(controlName);
    control?.markAsTouched();
  }

  setActive(active: boolean): void {
    this.form.patchValue({ active });
    this.form.markAsDirty();
  }

  discard(): void {
    if (this.mode === 'edit') {
      if (this.patientId) {
        this.router.navigate(['/items', this.patientId]);
      }
      return;
    }

    this.form.reset({
      fullName: '',
      lastName: '',
      documentNumber: '',
      birthDate: '',
      email: '',
      phone: '',
      contactPreference: '',
      contactHours: '',
      city: '',
      country: '',
      privateCare: false,
      insuranceName: '',
      affiliateNumber: '',
      plan: '',
      picture: '',
      active: true,
    });
    this.syncInsuranceFields();
    this.touchedFields.clear();
    this.toast.show(this.translate.instant('PATIENT.DISCARDED'), 'ok');
  }

  submit(): void {
    this.syncInsuranceFields();
    this.markAllTouched();

    if (this.form.invalid) {
      const invalidCount = Object.keys(this.form.controls).filter(
        (key) => this.form.get(key)?.invalid,
      ).length;
      const message =
        invalidCount === 1
          ? this.translate.instant('PATIENT.VALIDATION_SUMMARY_ONE')
          : this.translate.instant('PATIENT.VALIDATION_SUMMARY_MANY', { count: invalidCount });
      this.toast.show(message, 'err');
      this.focusFirstInvalid();
      return;
    }

    if (this.mode === 'edit' && this.changedFieldCount() === 0) {
      this.toast.show(this.translate.instant('PATIENT.NO_CHANGES_TO_SAVE'), 'ok');
      return;
    }

    const payload = normalizePatientFormValue(this.form.getRawValue());
    this.isSaving = true;

    if (this.mode === 'create') {
      this.patientService.createPatient(payload).subscribe({
        next: () => this.finishSuccess('PATIENT.CREATE_SUCCESS'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const version = this.loadedPatient?.version ?? 1;
    this.patientService.replacePatient(this.patientId, { ...payload, version }).subscribe({
      next: () => this.finishSuccess('PATIENT.UPDATE_SUCCESS'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private finishSuccess(messageKey: string): void {
    this.isSaving = false;
    this.toast.show(this.translate.instant(messageKey), 'ok');
    setTimeout(() => {
      this.router.navigate(['/items'], { queryParams: { refreshed: '1' } });
    }, 800);
  }

  private handleSaveError(error: HttpErrorResponse): void {
    this.isSaving = false;

    if (error.status === 409) {
      const message = error.error?.message ?? this.translate.instant('PATIENT.VERSION_CONFLICT');
      this.toast.show(message, 'err');
      if (this.mode === 'edit') {
        this.loadPatient();
      }
      return;
    }

    if (error.status === 400) {
      const message = error.error?.message ?? this.translate.instant('PATIENT.SAVE_ERROR');
      this.toast.show(message, 'err');
      return;
    }

    if (error.status === 403) {
      this.toast.show(this.translate.instant('ITEMS.PERMISSION_ERROR'), 'err');
      return;
    }

    this.toast.show(this.translate.instant('PATIENT.SAVE_ERROR'), 'err');
  }

  private markAllTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      this.touchedFields.add(key);
      this.form.get(key)?.markAsTouched();
    });
  }

  private focusFirstInvalid(): void {
    const first = Object.keys(this.form.controls).find((key) => this.form.get(key)?.invalid);
    if (!first) {
      return;
    }
    const element = document.getElementById(first);
    element?.focus();
  }

  changedFieldCount(): number {
    if (!this.originalSnapshot) {
      return 0;
    }
    const current = this.form.getRawValue();
    const original = JSON.parse(this.originalSnapshot) as Record<string, unknown>;
    return Object.keys(this.form.controls).filter((key) => current[key] !== original[key]).length;
  }

  private snapshotForm(): string {
    return JSON.stringify(this.form.getRawValue());
  }
}
