export const PATIENT_BUSINESS_FIELDS = [
  'fullName',
  'lastName',
  'documentNumber',
  'birthDate',
  'email',
  'phone',
  'contactPreference',
  'contactHours',
  'city',
  'country',
  'privateCare',
  'insuranceName',
  'affiliateNumber',
  'plan',
  'picture',
  'active'
];

export const CONTACT_PREFERENCE_VALUES = ['', 'call', 'whatsapp', 'email'];

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const URL_PATTERN = /^https?:\/\/.+/i;

const BIRTH_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

const PHONE_DIGITS_PATTERN = /^\d{6,20}$/;

function collapseSpaces(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeDocumentNumber(value) {
  return String(value ?? '').replace(/[\s.\-]/g, '');
}

export function isValidBirthDate(value) {
  if (typeof value !== 'string') {
    return false;
  }

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
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  const birthUtc = Date.UTC(year, month - 1, day);

  return birthUtc <= todayUtc;
}

function normalizeOptionalText(value) {
  return String(value ?? '').trim();
}

function normalizePhoneDigits(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') {
    return '';
  }
  return trimmed.replace(/\D/g, '');
}

function applyPrivateCareRules(result) {
  if (result.privateCare === true) {
    result.insuranceName = '';
    result.affiliateNumber = '';
    result.plan = '';
  }
  return result;
}

export function validateCoverageRules(data) {
  if (typeof data.privateCare !== 'boolean') {
    return 'La propiedad "privateCare" debe ser booleana.';
  }

  if (data.privateCare) {
    return null;
  }

  if (!String(data.insuranceName ?? '').trim()) {
    return 'La propiedad "insuranceName" es obligatoria cuando no es atención privada.';
  }

  if (!String(data.affiliateNumber ?? '').trim()) {
    return 'La propiedad "affiliateNumber" es obligatoria cuando no es atención privada.';
  }

  return null;
}

function normalizeBusinessSlice(data) {
  const result = {};

  if (data.fullName !== undefined) {
    result.fullName = collapseSpaces(data.fullName);
  }
  if (data.lastName !== undefined) {
    result.lastName = collapseSpaces(data.lastName);
  }
  if (data.documentNumber !== undefined) {
    result.documentNumber = normalizeDocumentNumber(data.documentNumber);
  }
  if (data.birthDate !== undefined) {
    result.birthDate = String(data.birthDate).trim();
  }
  if (data.email !== undefined) {
    result.email = data.email.trim().toLowerCase();
  }
  if (data.phone !== undefined) {
    result.phone = normalizePhoneDigits(data.phone);
  }
  if (data.contactPreference !== undefined) {
    result.contactPreference = normalizeOptionalText(data.contactPreference);
  }
  if (data.contactHours !== undefined) {
    result.contactHours = normalizeOptionalText(data.contactHours);
  }
  if (data.city !== undefined) {
    result.city = data.city.trim();
  }
  if (data.country !== undefined) {
    result.country = data.country.trim();
  }
  if (data.privateCare !== undefined) {
    result.privateCare = data.privateCare;
  }
  if (data.insuranceName !== undefined) {
    result.insuranceName = normalizeOptionalText(data.insuranceName);
  }
  if (data.affiliateNumber !== undefined) {
    result.affiliateNumber = normalizeOptionalText(data.affiliateNumber);
  }
  if (data.plan !== undefined) {
    result.plan = normalizeOptionalText(data.plan);
  }
  if (data.picture !== undefined) {
    result.picture = data.picture.trim();
  }
  if (data.active !== undefined) {
    result.active = data.active;
  }

  return applyPrivateCareRules(result);
}

function validateVersionValue(version) {
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    return 'La propiedad "version" debe ser un entero positivo.';
  }

  return null;
}

function validateBusinessField(field, value) {
  if (field === 'active' || field === 'privateCare') {
    if (typeof value !== 'boolean') {
      return `La propiedad "${field}" debe ser booleana.`;
    }
    return null;
  }

  if (typeof value !== 'string') {
    return `La propiedad "${field}" debe ser un texto.`;
  }

  const trimmed = value.trim();

  if (
    field === 'picture' ||
    field === 'phone' ||
    field === 'contactHours' ||
    field === 'plan' ||
    field === 'insuranceName' ||
    field === 'affiliateNumber'
  ) {
    if (trimmed.length === 0) {
      return null;
    }
  }

  if (field === 'contactPreference') {
    if (trimmed.length === 0) {
      return null;
    }
    if (!CONTACT_PREFERENCE_VALUES.includes(trimmed)) {
      return 'La propiedad "contactPreference" no es válida.';
    }
    return null;
  }

  if (field === 'picture') {
    if (trimmed.length > 500 || !URL_PATTERN.test(trimmed)) {
      return 'La propiedad "picture" debe ser una URL http o https válida.';
    }
    return null;
  }

  if (field === 'phone') {
    const digits = normalizePhoneDigits(value);
    if (digits.length === 0) {
      return null;
    }
    if (!PHONE_DIGITS_PATTERN.test(digits)) {
      return 'La propiedad "phone" debe tener entre 6 y 20 dígitos.';
    }
    return null;
  }

  if (trimmed.length === 0) {
    return `La propiedad "${field}" debe ser un texto no vacío.`;
  }

  if (field === 'fullName' || field === 'lastName') {
    const normalized = collapseSpaces(value);
    if (normalized.length < 2 || normalized.length > 120) {
      return `La propiedad "${field}" debe tener entre 2 y 120 caracteres.`;
    }
    return null;
  }

  if (field === 'documentNumber') {
    const normalized = normalizeDocumentNumber(value);
    if (normalized.length < 7 || normalized.length > 11) {
      return 'La propiedad "documentNumber" debe tener entre 7 y 11 dígitos.';
    }
    return null;
  }

  if (field === 'birthDate') {
    if (!isValidBirthDate(trimmed)) {
      return 'La propiedad "birthDate" debe tener formato DD-MM-YYYY válido.';
    }
    return null;
  }

  if (field === 'email') {
    const email = trimmed.toLowerCase();
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return 'La propiedad "email" no tiene un formato válido.';
    }
    return null;
  }

  if (field === 'city' || field === 'country') {
    if (trimmed.length < 2 || trimmed.length > 80) {
      return `La propiedad "${field}" debe tener entre 2 y 80 caracteres.`;
    }
    return null;
  }

  if (field === 'insuranceName' || field === 'affiliateNumber' || field === 'contactHours' || field === 'plan') {
    if (trimmed.length > 80) {
      return `La propiedad "${field}" no puede superar 80 caracteres.`;
    }
    return null;
  }

  return null;
}

/**
 * @param {Record<string, unknown>} data
 */
export function assertValidPatientPersistPayload(data) {
  const slice = {};
  for (const field of PATIENT_BUSINESS_FIELDS) {
    slice[field] = data[field];
  }

  const normalized = normalizeBusinessSlice(slice);

  for (const field of PATIENT_BUSINESS_FIELDS) {
    const fieldError = validateBusinessField(field, normalized[field]);
    if (fieldError) {
      throw new Error(fieldError);
    }
  }

  const coverageError = validateCoverageRules(normalized);
  if (coverageError) {
    throw new Error(coverageError);
  }
}

/**
 * @param {unknown} data
 * @param {'create' | 'replace' | 'patch'} mode
 */
export function validatePatientInput(data, mode) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON.' };
  }

  const allowedKeys =
    mode === 'create'
      ? PATIENT_BUSINESS_FIELDS
      : [...PATIENT_BUSINESS_FIELDS, 'version'];

  const keys = Object.keys(data);
  const unknown = keys.find((key) => !allowedKeys.includes(key));
  if (unknown) {
    return { ok: false, message: `La propiedad "${unknown}" no está permitida.` };
  }

  if (mode === 'create') {
    const missing = PATIENT_BUSINESS_FIELDS.find((field) => data[field] === undefined);
    if (missing) {
      return { ok: false, message: `La propiedad "${missing}" es obligatoria.` };
    }
  } else if (mode === 'replace') {
    const missing = PATIENT_BUSINESS_FIELDS.find((field) => data[field] === undefined);
    if (missing) {
      return { ok: false, message: `La propiedad "${missing}" es obligatoria.` };
    }
    if (data.version === undefined) {
      return { ok: false, message: 'La propiedad "version" es obligatoria.' };
    }
  } else {
    const businessKeys = keys.filter((key) => PATIENT_BUSINESS_FIELDS.includes(key));
    if (businessKeys.length === 0) {
      return { ok: false, message: 'Se debe enviar al menos una propiedad de negocio.' };
    }
    if (data.version === undefined) {
      return { ok: false, message: 'La propiedad "version" es obligatoria.' };
    }
  }

  if (data.version !== undefined) {
    const versionError = validateVersionValue(data.version);
    if (versionError) {
      return { ok: false, message: versionError };
    }
  }

  for (const field of PATIENT_BUSINESS_FIELDS) {
    if (data[field] === undefined) {
      continue;
    }

    const fieldError = validateBusinessField(field, data[field]);
    if (fieldError) {
      return { ok: false, message: fieldError };
    }
  }

  const value = normalizeBusinessSlice(data);
  if (data.version !== undefined) {
    value.version = data.version;
  }

  if (mode === 'create' || mode === 'replace') {
    const coverageError = validateCoverageRules(value);
    if (coverageError) {
      return { ok: false, message: coverageError };
    }
  }

  return { ok: true, value };
}

export function mergeAndNormalizePatientBusiness(existing, patch) {
  const merged = {};
  for (const field of PATIENT_BUSINESS_FIELDS) {
    merged[field] = patch[field] !== undefined ? patch[field] : existing[field];
  }

  const normalized = normalizeBusinessSlice(merged);

  for (const field of PATIENT_BUSINESS_FIELDS) {
    const fieldError = validateBusinessField(field, normalized[field]);
    if (fieldError) {
      return { ok: false, message: fieldError };
    }
  }

  const coverageError = validateCoverageRules(normalized);
  if (coverageError) {
    return { ok: false, message: coverageError };
  }

  return { ok: true, value: normalized };
}

export function validateVersionBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON.' };
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'version') {
    return { ok: false, message: 'Solo se permite la propiedad "version".' };
  }

  const versionError = validateVersionValue(body.version);
  if (versionError) {
    return { ok: false, message: versionError };
  }

  return { ok: true, version: body.version };
}

export function parseVersionQuery(versionQuery) {
  if (versionQuery === undefined || versionQuery === '') {
    return { ok: false, message: 'El parámetro "version" es obligatorio.' };
  }

  const version = Number(versionQuery);
  if (!Number.isInteger(version) || version < 1) {
    return { ok: false, message: 'El parámetro "version" debe ser un entero positivo.' };
  }

  return { ok: true, version };
}

export function createAuditFields(actorId, now = new Date().toISOString()) {
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
    deletedAt: null,
    deletedBy: null
  };
}

const STORED_DEFAULTS = {
  lastName: '',
  documentNumber: '',
  birthDate: '',
  phone: '',
  contactPreference: '',
  contactHours: '',
  privateCare: false,
  insuranceName: '',
  affiliateNumber: '',
  plan: ''
};

export function normalizeStoredPatient(patient) {
  if (!patient) {
    return null;
  }

  const normalizedPhone =
    patient.phone != null && String(patient.phone).trim() !== ''
      ? normalizePhoneDigits(patient.phone)
      : '';

  return {
    ...STORED_DEFAULTS,
    ...patient,
    version: typeof patient.version === 'number' ? patient.version : 1,
    createdAt: patient.createdAt ?? null,
    updatedAt: patient.updatedAt ?? null,
    createdBy: patient.createdBy ?? null,
    updatedBy: patient.updatedBy ?? null,
    deletedAt: patient.deletedAt ?? null,
    deletedBy: patient.deletedBy ?? null,
    email: patient.email ? String(patient.email).toLowerCase() : patient.email,
    documentNumber: patient.documentNumber
      ? normalizeDocumentNumber(patient.documentNumber)
      : '',
    phone: normalizedPhone,
    privateCare: patient.privateCare === true
  };
}

export function isDeleted(patient) {
  return patient?.deletedAt != null;
}

export function documentIndexId(documentNumber) {
  return normalizeDocumentNumber(documentNumber);
}
