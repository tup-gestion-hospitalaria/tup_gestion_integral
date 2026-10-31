export const REFERRAL_STATUSES = [
  'draft',
  'submitted',
  'accepted',
  'rejected',
  'completed',
  'cancelled'
];

export const OPEN_REFERRAL_STATUSES = ['draft', 'submitted', 'accepted'];

export const REFERRAL_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export const REFERRAL_CREATE_FIELDS = [
  'patientId',
  'destination',
  'reason',
  'notes',
  'priority',
  'responsibleId'
];

export const REFERRAL_PATCH_FIELDS = [
  'destination',
  'reason',
  'notes',
  'priority',
  'responsibleId'
];

export const FORBIDDEN_CLIENT_FIELDS = [
  'status',
  'rejectionReason',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'submittedAt',
  'decidedAt',
  'closedAt',
  'id'
];

const TRANSITIONS = {
  draft: ['submitted', 'cancelled'],
  submitted: ['accepted', 'rejected', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  rejected: [],
  completed: [],
  cancelled: []
};

const TRANSITION_ACTIONS = {
  submitted: 'referral.submitted',
  accepted: 'referral.accepted',
  rejected: 'referral.rejected',
  completed: 'referral.completed',
  cancelled: 'referral.cancelled'
};

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

function collapseSpaces(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function openLockKey(patientId, healthsiteId) {
  return `${patientId}__${healthsiteId}`;
}

export function isAllowedTransition(fromStatus, toStatus) {
  return TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

export function transitionAction(toStatus) {
  return TRANSITION_ACTIONS[toStatus] ?? null;
}

export function validateIdempotencyKey(headerValue) {
  if (headerValue === undefined || headerValue === null || headerValue === '') {
    return { ok: true, value: null };
  }

  if (typeof headerValue !== 'string') {
    return { ok: false, message: 'El encabezado Idempotency-Key debe ser texto.' };
  }

  const trimmed = headerValue.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: null };
  }

  if (trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return {
      ok: false,
      message: `El encabezado Idempotency-Key no puede superar ${MAX_IDEMPOTENCY_KEY_LENGTH} caracteres.`
    };
  }

  return { ok: true, value: trimmed };
}

function validateDestination(destination) {
  if (!destination || typeof destination !== 'object' || Array.isArray(destination)) {
    return 'La propiedad "destination" debe ser un objeto.';
  }

  const keys = Object.keys(destination);
  const allowed = ['healthsiteId', 'name', 'address'];
  const unknown = keys.find((key) => !allowed.includes(key));
  if (unknown) {
    return `La propiedad "destination.${unknown}" no está permitida.`;
  }

  for (const field of allowed) {
    if (destination[field] === undefined) {
      return `La propiedad "destination.${field}" es obligatoria.`;
    }
    if (typeof destination[field] !== 'string') {
      return `La propiedad "destination.${field}" debe ser un texto.`;
    }
    const trimmed = destination[field].trim();
    if (trimmed.length === 0) {
      return `La propiedad "destination.${field}" debe ser un texto no vacío.`;
    }
    if (trimmed.length > 200 && field === 'healthsiteId') {
      return 'La propiedad "destination.healthsiteId" es demasiado larga.';
    }
    if (trimmed.length > 200 && field === 'name') {
      return 'La propiedad "destination.name" es demasiado larga.';
    }
    if (trimmed.length > 300 && field === 'address') {
      return 'La propiedad "destination.address" es demasiado larga.';
    }
  }

  return null;
}

function normalizeDestination(destination) {
  return {
    healthsiteId: destination.healthsiteId.trim(),
    name: collapseSpaces(destination.name),
    address: collapseSpaces(destination.address)
  };
}

function validateNotes(notes) {
  if (notes === null) {
    return null;
  }
  if (typeof notes !== 'string') {
    return 'La propiedad "notes" debe ser texto o null.';
  }
  if (notes.length > 2000) {
    return 'La propiedad "notes" no puede superar 2000 caracteres.';
  }
  return null;
}

function validateReason(reason) {
  if (typeof reason !== 'string') {
    return 'La propiedad "reason" debe ser un texto.';
  }
  const trimmed = reason.trim();
  if (trimmed.length < 3 || trimmed.length > 500) {
    return 'La propiedad "reason" debe tener entre 3 y 500 caracteres.';
  }
  return null;
}

function validatePriority(priority) {
  if (priority === undefined) {
    return null;
  }
  if (!REFERRAL_PRIORITIES.includes(priority)) {
    return 'La propiedad "priority" no es válida.';
  }
  return null;
}

function validateResponsibleId(responsibleId) {
  if (responsibleId === undefined) {
    return null;
  }
  if (typeof responsibleId !== 'string' || responsibleId.trim().length === 0) {
    return 'La propiedad "responsibleId" debe ser un texto no vacío.';
  }
  if (responsibleId.trim().length > 128) {
    return 'La propiedad "responsibleId" es demasiado larga.';
  }
  return null;
}

function validatePatientId(patientId) {
  if (typeof patientId !== 'string' || patientId.trim().length === 0) {
    return 'La propiedad "patientId" debe ser un texto no vacío.';
  }
  if (patientId.trim().length > 128) {
    return 'La propiedad "patientId" es demasiado larga.';
  }
  return null;
}

function findForbiddenField(data) {
  return FORBIDDEN_CLIENT_FIELDS.find((field) => data[field] !== undefined);
}

export function validateReferralCreateInput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON.' };
  }

  const forbidden = findForbiddenField(data);
  if (forbidden) {
    return { ok: false, message: `La propiedad "${forbidden}" no está permitida.` };
  }

  const keys = Object.keys(data);
  const unknown = keys.find((key) => !REFERRAL_CREATE_FIELDS.includes(key));
  if (unknown) {
    return { ok: false, message: `La propiedad "${unknown}" no está permitida.` };
  }

  for (const field of ['patientId', 'destination', 'reason']) {
    if (data[field] === undefined) {
      return { ok: false, message: `La propiedad "${field}" es obligatoria.` };
    }
  }

  if (data.notes === undefined) {
    return { ok: false, message: 'La propiedad "notes" es obligatoria (puede ser null).' };
  }

  let message = validatePatientId(data.patientId);
  if (message) return { ok: false, message };

  message = validateDestination(data.destination);
  if (message) return { ok: false, message };

  message = validateReason(data.reason);
  if (message) return { ok: false, message };

  message = validateNotes(data.notes);
  if (message) return { ok: false, message };

  message = validatePriority(data.priority);
  if (message) return { ok: false, message };

  message = validateResponsibleId(data.responsibleId);
  if (message) return { ok: false, message };

  const value = {
    patientId: data.patientId.trim(),
    destination: normalizeDestination(data.destination),
    reason: data.reason.trim(),
    notes: data.notes === null ? null : data.notes.trim(),
    priority: data.priority ?? 'normal',
    responsibleId: data.responsibleId?.trim()
  };

  return { ok: true, value };
}

export function validateReferralPatchInput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON.' };
  }

  const forbidden = findForbiddenField(data);
  if (forbidden) {
    return { ok: false, message: `La propiedad "${forbidden}" no está permitida.` };
  }

  const keys = Object.keys(data);
  const unknown = keys.find((key) => !REFERRAL_PATCH_FIELDS.includes(key));
  if (unknown) {
    return { ok: false, message: `La propiedad "${unknown}" no está permitida.` };
  }

  if (keys.length === 0) {
    return { ok: false, message: 'Se debe enviar al menos una propiedad.' };
  }

  const value = {};

  if (data.destination !== undefined) {
    const destinationError = validateDestination(data.destination);
    if (destinationError) {
      return { ok: false, message: destinationError };
    }
    value.destination = normalizeDestination(data.destination);
  }

  if (data.reason !== undefined) {
    const reasonError = validateReason(data.reason);
    if (reasonError) {
      return { ok: false, message: reasonError };
    }
    value.reason = data.reason.trim();
  }

  if (data.notes !== undefined) {
    const notesError = validateNotes(data.notes);
    if (notesError) {
      return { ok: false, message: notesError };
    }
    value.notes = data.notes === null ? null : data.notes.trim();
  }

  if (data.priority !== undefined) {
    const priorityError = validatePriority(data.priority);
    if (priorityError) {
      return { ok: false, message: priorityError };
    }
    value.priority = data.priority;
  }

  if (data.responsibleId !== undefined) {
    const responsibleError = validateResponsibleId(data.responsibleId);
    if (responsibleError) {
      return { ok: false, message: responsibleError };
    }
    value.responsibleId = data.responsibleId.trim();
  }

  return { ok: true, value };
}

export function validateTransitionInput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON.' };
  }

  const keys = Object.keys(data);
  const allowed = ['to', 'rejectionReason'];
  const unknown = keys.find((key) => !allowed.includes(key));
  if (unknown) {
    return { ok: false, message: `La propiedad "${unknown}" no está permitida.` };
  }

  if (data.to === undefined) {
    return { ok: false, message: 'La propiedad "to" es obligatoria.' };
  }

  if (!REFERRAL_STATUSES.includes(data.to)) {
    return { ok: false, message: 'La propiedad "to" no es un estado válido.' };
  }

  if (data.to === 'rejected') {
    if (data.rejectionReason === undefined) {
      return { ok: false, message: 'La propiedad "rejectionReason" es obligatoria al rechazar.' };
    }
    if (typeof data.rejectionReason !== 'string' || data.rejectionReason.trim().length === 0) {
      return {
        ok: false,
        message: 'La propiedad "rejectionReason" debe ser un texto no vacío.'
      };
    }
  } else if (data.rejectionReason !== undefined) {
    return {
      ok: false,
      message: 'La propiedad "rejectionReason" solo aplica al rechazar.'
    };
  }

  return {
    ok: true,
    value: {
      to: data.to,
      rejectionReason:
        data.to === 'rejected' ? data.rejectionReason.trim() : null
    }
  };
}

export function parseReferralListQuery(query) {
  let status;
  if (query.status !== undefined) {
    if (typeof query.status !== 'string' || !REFERRAL_STATUSES.includes(query.status)) {
      return { ok: false, message: 'El parámetro "status" no es válido.' };
    }
    status = query.status;
  }

  let patientId;
  if (query.patientId !== undefined) {
    if (typeof query.patientId !== 'string' || query.patientId.trim().length === 0) {
      return { ok: false, message: 'El parámetro "patientId" debe ser texto.' };
    }
    patientId = query.patientId.trim();
  }

  return { ok: true, value: { status, patientId } };
}

export function normalizeStoredReferral(referral) {
  if (!referral) {
    return null;
  }

  return {
    ...referral,
    notes: referral.notes ?? null,
    rejectionReason: referral.rejectionReason ?? null,
    priority: referral.priority ?? 'normal',
    submittedAt: referral.submittedAt ?? null,
    decidedAt: referral.decidedAt ?? null,
    closedAt: referral.closedAt ?? null
  };
}

export function referralToResponse(referral, { includeHistory = false, history = [] } = {}) {
  const normalized = normalizeStoredReferral(referral);
  if (!includeHistory) {
    return normalized;
  }

  return {
    ...normalized,
    history: history.slice().sort((left, right) => left.at.localeCompare(right.at))
  };
}

export function buildCreateBodyFingerprint(value) {
  return JSON.stringify({
    patientId: value.patientId,
    destination: value.destination,
    reason: value.reason,
    notes: value.notes,
    priority: value.priority,
    responsibleId: value.responsibleId ?? null
  });
}
