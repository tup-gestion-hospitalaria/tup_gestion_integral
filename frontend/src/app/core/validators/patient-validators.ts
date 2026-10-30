import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { PatientWritePayload } from '../../models/patient';

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const URL_PATTERN = /^https?:\/\/.+/i;

function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function patientFullNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return { required: true };
    }
    const normalized = collapseSpaces(String(raw));
    if (normalized.length < 2 || normalized.length > 120) {
      return { fullNameLength: true };
    }
    return null;
  };
}

export function patientEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return { required: true };
    }
    const email = String(raw).trim().toLowerCase();
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return { emailFormat: true };
    }
    return null;
  };
}

export function patientPlaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return { required: true };
    }
    const trimmed = String(raw).trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      return { placeLength: true };
    }
    return null;
  };
}

export function patientPictureValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return null;
    }
    const trimmed = String(raw).trim();
    if (trimmed.length > 500 || !URL_PATTERN.test(trimmed)) {
      return { pictureUrl: true };
    }
    return null;
  };
}

export function patientFieldErrorKey(errors: ValidationErrors | null): string | null {
  if (!errors) {
    return null;
  }
  if (errors['required']) {
    return 'PATIENT.VALIDATION_REQUIRED';
  }
  if (errors['fullNameLength']) {
    return 'PATIENT.VALIDATION_FULL_NAME';
  }
  if (errors['emailFormat']) {
    return 'PATIENT.VALIDATION_EMAIL';
  }
  if (errors['placeLength']) {
    return 'PATIENT.VALIDATION_PLACE';
  }
  if (errors['pictureUrl']) {
    return 'PATIENT.VALIDATION_PICTURE';
  }
  return 'PATIENT.VALIDATION_REQUIRED';
}

export function normalizePatientFormValue(value: {
  fullName: string;
  email: string;
  city: string;
  country: string;
  picture: string;
  active: boolean;
}): PatientWritePayload {
  return {
    fullName: collapseSpaces(value.fullName),
    email: value.email.trim().toLowerCase(),
    city: value.city.trim(),
    country: value.country.trim(),
    picture: value.picture.trim(),
    active: value.active,
  };
}
