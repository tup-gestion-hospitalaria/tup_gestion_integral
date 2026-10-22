export const PATIENT_BUSINESS_FIELDS = [
  'fullName',
  'email',
  'city',
  'country',
  'picture',
  'active'
];

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const URL_PATTERN = /^https?:\/\/.+/i;

function collapseSpaces(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeBusinessSlice(data) {
  const result = {};

  if (data.fullName !== undefined) {
    result.fullName = collapseSpaces(data.fullName);
  }
  if (data.email !== undefined) {
    result.email = data.email.trim().toLowerCase();
  }
  if (data.city !== undefined) {
    result.city = data.city.trim();
  }
  if (data.country !== undefined) {
    result.country = data.country.trim();
  }
  if (data.picture !== undefined) {
    result.picture = data.picture.trim();
  }
  if (data.active !== undefined) {
    result.active = data.active;
  }

  return result;
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
  if (field === 'active') {
    if (typeof value !== 'boolean') {
      return 'La propiedad "active" debe ser booleana.';
    }
    return null;
  }

  if (typeof value !== 'string') {
    return `La propiedad "${field}" debe ser un texto.`;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return `La propiedad "${field}" debe ser un texto no vacío.`;
  }

  if (field === 'fullName') {
    const normalized = collapseSpaces(value);
    if (normalized.length < 2 || normalized.length > 120) {
      return 'La propiedad "fullName" debe tener entre 2 y 120 caracteres.';
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

  if (field === 'picture') {
    if (trimmed.length > 500 || !URL_PATTERN.test(trimmed)) {
      return 'La propiedad "picture" debe ser una URL http o https válida.';
    }
    return null;
  }

  return null;
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

  return { ok: true, value };
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

export function normalizeStoredPatient(patient) {
  if (!patient) {
    return null;
  }

  return {
    ...patient,
    version: typeof patient.version === 'number' ? patient.version : 1,
    createdAt: patient.createdAt ?? null,
    updatedAt: patient.updatedAt ?? null,
    createdBy: patient.createdBy ?? null,
    updatedBy: patient.updatedBy ?? null,
    deletedAt: patient.deletedAt ?? null,
    deletedBy: patient.deletedBy ?? null,
    email: patient.email ? String(patient.email).toLowerCase() : patient.email
  };
}

export function isDeleted(patient) {
  return patient?.deletedAt != null;
}
