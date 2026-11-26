import {
  assertValidPatientPersistPayload,
  documentIndexId
} from './patient-schema.js';

export class PatientStoreError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export class PatientStore {
  constructor(initialPatients = []) {
    this.patients = structuredClone(initialPatients);
    this.documentIndex = new Map();

    for (const patient of this.patients) {
      const key = documentIndexId(patient.documentNumber ?? '');
      if (key) {
        this.documentIndex.set(key, patient.id);
      }
    }
  }

  assertDocumentUnique(documentNumber, patientId) {
    const key = documentIndexId(documentNumber);
    if (!key) {
      return;
    }

    const owner = this.documentIndex.get(key);
    if (owner && owner !== patientId) {
      throw new PatientStoreError(
        'Ya existe un paciente con ese documento.',
        'DUPLICATE_DOCUMENT'
      );
    }
  }

  syncDocumentIndex(patientId, previousDocument, nextDocument) {
    const previousKey = documentIndexId(previousDocument ?? '');
    const nextKey = documentIndexId(nextDocument ?? '');

    if (previousKey && this.documentIndex.get(previousKey) === patientId) {
      this.documentIndex.delete(previousKey);
    }

    if (nextKey) {
      this.documentIndex.set(nextKey, patientId);
    }
  }

  async listAll() {
    return structuredClone(this.patients);
  }

  async findById(id) {
    const patient = this.patients.find((item) => item.id === id);
    return patient ? structuredClone(patient) : null;
  }

  async insert(id, data) {
    const { id: _ignored, ...payload } = data;
    assertValidPatientPersistPayload(payload);
    this.assertDocumentUnique(payload.documentNumber, id);

    const patient = { id, ...data };
    this.patients.push(patient);
    this.syncDocumentIndex(id, '', payload.documentNumber);
    return structuredClone(patient);
  }

  async save(id, data) {
    const index = this.patients.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    const existing = this.patients[index];
    const { id: _ignored, ...payload } = data;
    assertValidPatientPersistPayload(payload);
    this.assertDocumentUnique(payload.documentNumber, id);

    this.patients[index] = { id, ...data };
    this.syncDocumentIndex(id, existing.documentNumber, payload.documentNumber);
    return structuredClone(this.patients[index]);
  }
}
