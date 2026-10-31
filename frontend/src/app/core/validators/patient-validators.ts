import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { PatientWritePayload } from '../../models/patient';

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const URL_PATTERN = /^https?:\/\/.+/i;

const BIRTH_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

const CONTACT_PREFERENCES = ['', 'call', 'whatsapp', 'email'] as const;

function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeDocumentNumber(value: string): string {
  return String(value ?? '').replace(/[\s.-]/g, '');
}

export function isValidBirthDate(value: string): boolean {
  const match = value.match(BIRTH_DATE_PATTERN);
  if (!match) {
    return false;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (year < 1900) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const birthUtc = Date.UTC(year, month - 1, day);

  return birthUtc <= todayUtc;
}

function normalizePhoneDigits(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') {
    return '';
  }
  return trimmed.replace(/\D/g, '');
}

export function patientNamePartValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return { required: true };
    }
    const normalized = collapseSpaces(String(raw));
    if (normalized.length < 2 || normalized.length > 120) {
      return { namePartLength: true };
    }
    return null;
  };
}

export function patientFullNameValidator(): ValidatorFn {
  return patientNamePartValidator();
}

export function patientLastNameValidator(): ValidatorFn {
  return patientNamePartValidator();
}

export function patientDocumentValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return { required: true };
    }
    const normalized = normalizeDocumentNumber(String(raw));
    if (normalized.length < 7 || normalized.length > 11) {
      return { documentFormat: true };
    }
    return null;
  };
}

export function patientBirthDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return { required: true };
    }
    const trimmed = String(raw).trim();
    if (!isValidBirthDate(trimmed)) {
      return { birthDateFormat: true };
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

export function patientPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return null;
    }
    const digits = normalizePhoneDigits(String(raw));
    if (digits.length < 6 || digits.length > 20) {
      return { phoneFormat: true };
    }
    return null;
  };
}

export function patientOptionalTextValidator(maxLength = 80): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return null;
    }
    if (String(raw).trim().length > maxLength) {
      return { optionalTextLength: true };
    }
    return null;
  };
}

export function patientContactPreferenceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    const value = raw == null ? '' : String(raw);
    if (!CONTACT_PREFERENCES.includes(value as (typeof CONTACT_PREFERENCES)[number])) {
      return { contactPreference: true };
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

export function patientInsuranceNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const group = control.parent;
    if (!group) {
      return null;
    }
    if (group.get('privateCare')?.value === true) {
      return null;
    }
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return { required: true };
    }
    if (String(raw).trim().length > 80) {
      return { optionalTextLength: true };
    }
    return null;
  };
}

export function patientAffiliateNumberValidator(): ValidatorFn {
  return patientInsuranceNameValidator();
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
  if (errors['namePartLength']) {
    return 'PATIENT.VALIDATION_NAME_PART';
  }
  if (errors['documentFormat']) {
    return 'PATIENT.VALIDATION_DOCUMENT';
  }
  if (errors['birthDateFormat']) {
    return 'PATIENT.VALIDATION_BIRTH_DATE';
  }
  if (errors['emailFormat']) {
    return 'PATIENT.VALIDATION_EMAIL';
  }
  if (errors['phoneFormat']) {
    return 'PATIENT.VALIDATION_PHONE';
  }
  if (errors['contactPreference']) {
    return 'PATIENT.VALIDATION_CONTACT_PREFERENCE';
  }
  if (errors['placeLength']) {
    return 'PATIENT.VALIDATION_PLACE';
  }
  if (errors['optionalTextLength']) {
    return 'PATIENT.VALIDATION_PLACE';
  }
  if (errors['pictureUrl']) {
    return 'PATIENT.VALIDATION_PICTURE';
  }
  return 'PATIENT.VALIDATION_REQUIRED';
}

export function normalizePatientFormValue(value: {
  fullName: string;
  lastName: string;
  documentNumber: string;
  birthDate: string;
  email: string;
  phone: string;
  contactPreference: string;
  contactHours: string;
  city: string;
  country: string;
  privateCare: boolean;
  insuranceName: string;
  affiliateNumber: string;
  plan: string;
  picture: string;
  active: boolean;
}): PatientWritePayload {
  const privateCare = value.privateCare === true;
  return {
    fullName: collapseSpaces(value.fullName),
    lastName: collapseSpaces(value.lastName),
    documentNumber: normalizeDocumentNumber(value.documentNumber),
    birthDate: value.birthDate.trim(),
    email: value.email.trim().toLowerCase(),
    phone: normalizePhoneDigits(value.phone),
    contactPreference: value.contactPreference.trim(),
    contactHours: value.contactHours.trim(),
    city: value.city.trim(),
    country: value.country.trim(),
    privateCare,
    insuranceName: privateCare ? '' : value.insuranceName.trim(),
    affiliateNumber: privateCare ? '' : value.affiliateNumber.trim(),
    plan: privateCare ? '' : value.plan.trim(),
    picture: value.picture.trim(),
    active: value.active,
  };
}

export function patientDisplayName(fullName: string, lastName?: string | null): string {
  return [fullName, lastName]
    .filter((part) => part && String(part).trim())
    .join(' ')
    .trim();
}
