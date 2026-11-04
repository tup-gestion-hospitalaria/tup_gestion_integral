import { randomUUID } from 'node:crypto';

import { filterAndPaginate, parseListQuery } from './patient-query.js';
import {
  createAuditFields,
  documentIndexId,
  isDeleted,
  mergeAndNormalizePatientBusiness,
  normalizeStoredPatient,
  PATIENT_BUSINESS_FIELDS
} from './patient-schema.js';

export class PatientServiceError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class PatientService {
  constructor(store) {
    this.store = store;
  }

  async listRaw() {
    const patients = await this.store.listAll();
    return patients.map((patient) => normalizeStoredPatient(patient));
  }

  async list(query) {
    const parsed = parseListQuery(query);
    if (!parsed.ok) {
      throw new PatientServiceError(parsed.status, parsed.message, 'INVALID_QUERY');
    }

    const patients = await this.listRaw();
    return filterAndPaginate(patients, parsed.value);
  }

  async getById(id, { includeDeleted = false } = {}) {
    const patient = normalizeStoredPatient(await this.store.findById(id));
    if (!patient) {
      return null;
    }

    if (!includeDeleted && isDeleted(patient)) {
      return null;
    }

    return patient;
  }

  async findDuplicateEmail(email, excludeId = null) {
    const normalizedEmail = email.toLowerCase();
    const patients = await this.listRaw();
    return patients.find(
      (patient) =>
        patient.id !== excludeId &&
        String(patient.email ?? '').toLowerCase() === normalizedEmail
    );
  }

  async findDuplicateDocument(documentNumber, excludeId = null) {
    const normalized = documentIndexId(documentNumber);
    if (!normalized) {
      return null;
    }

    const patients = await this.listRaw();
    return patients.find(
      (patient) =>
        patient.id !== excludeId &&
        documentIndexId(patient.documentNumber ?? '') === normalized
    );
  }

  assertVersion(patient, expectedVersion) {
    const currentVersion = patient.version ?? 1;
    if (currentVersion !== expectedVersion) {
      throw new PatientServiceError(
        409,
        'La versión enviada no coincide con la del paciente.',
        'VERSION_CONFLICT'
      );
    }
  }

  async create(businessData, actorId) {
    const duplicateEmail = await this.findDuplicateEmail(businessData.email);
    if (duplicateEmail) {
      throw new PatientServiceError(
        409,
        'Ya existe un paciente con ese email.',
        'DUPLICATE_EMAIL'
      );
    }

    const duplicateDocument = await this.findDuplicateDocument(businessData.documentNumber);
    if (duplicateDocument) {
      throw new PatientServiceError(
        409,
        'Ya existe un paciente con ese documento.',
        'DUPLICATE_DOCUMENT'
      );
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const patient = {
      id,
      ...businessData,
      ...createAuditFields(actorId, now)
    };

    await this.store.insert(id, patient);
    return normalizeStoredPatient(patient);
  }

  async replace(id, input, actorId) {
    const existing = normalizeStoredPatient(await this.store.findById(id));
    if (!existing || isDeleted(existing)) {
      return null;
    }

    this.assertVersion(existing, input.version);

    const duplicateEmail = await this.findDuplicateEmail(input.email, id);
    if (duplicateEmail) {
      throw new PatientServiceError(
        409,
        'Ya existe un paciente con ese email.',
        'DUPLICATE_EMAIL'
      );
    }

    const duplicateDocument = await this.findDuplicateDocument(input.documentNumber, id);
    if (duplicateDocument) {
      throw new PatientServiceError(
        409,
        'Ya existe un paciente con ese documento.',
        'DUPLICATE_DOCUMENT'
      );
    }

    const now = new Date().toISOString();
    const business = {};
    for (const field of PATIENT_BUSINESS_FIELDS) {
      business[field] = input[field];
    }

    const patient = {
      id,
      ...business,
      version: existing.version + 1,
      createdAt: existing.createdAt ?? now,
      createdBy: existing.createdBy ?? actorId,
      updatedAt: now,
      updatedBy: actorId,
      deletedAt: null,
      deletedBy: null
    };

    await this.store.save(id, patient);
    return normalizeStoredPatient(patient);
  }

  async patch(id, input, actorId) {
    const existing = normalizeStoredPatient(await this.store.findById(id));
    if (!existing || isDeleted(existing)) {
      return null;
    }

    this.assertVersion(existing, input.version);

    const business = {};
    for (const field of PATIENT_BUSINESS_FIELDS) {
      if (input[field] !== undefined) {
        business[field] = input[field];
      }
    }

    const merged = mergeAndNormalizePatientBusiness(existing, business);
    if (!merged.ok) {
      throw new PatientServiceError(400, merged.message, 'INVALID_INPUT');
    }

    const nextEmail = merged.value.email;
    const duplicateEmail = await this.findDuplicateEmail(nextEmail, id);
    if (duplicateEmail) {
      throw new PatientServiceError(
        409,
        'Ya existe un paciente con ese email.',
        'DUPLICATE_EMAIL'
      );
    }

    const duplicateDocument = await this.findDuplicateDocument(merged.value.documentNumber, id);
    if (duplicateDocument) {
      throw new PatientServiceError(
        409,
        'Ya existe un paciente con ese documento.',
        'DUPLICATE_DOCUMENT'
      );
    }

    const now = new Date().toISOString();
    const patient = {
      ...existing,
      ...merged.value,
      id,
      version: existing.version + 1,
      updatedAt: now,
      updatedBy: actorId
    };

    await this.store.save(id, patient);
    return normalizeStoredPatient(patient);
  }

  async softDelete(id, version, actorId) {
    const existing = normalizeStoredPatient(await this.store.findById(id));
    if (!existing || isDeleted(existing)) {
      return null;
    }

    this.assertVersion(existing, version);

    const now = new Date().toISOString();
    const patient = {
      ...existing,
      version: existing.version + 1,
      updatedAt: now,
      updatedBy: actorId,
      deletedAt: now,
      deletedBy: actorId
    };

    await this.store.save(id, patient);
    return true;
  }

  async restore(id, version, actorId) {
    const existing = normalizeStoredPatient(await this.store.findById(id));
    if (!existing) {
      return null;
    }

    if (!isDeleted(existing)) {
      throw new PatientServiceError(
        409,
        'El paciente no está dado de baja.',
        'NOT_DELETED'
      );
    }

    this.assertVersion(existing, version);

    const now = new Date().toISOString();
    const patient = {
      ...existing,
      version: existing.version + 1,
      updatedAt: now,
      updatedBy: actorId,
      deletedAt: null,
      deletedBy: null
    };

    await this.store.save(id, patient);
    return normalizeStoredPatient(patient);
  }
}
