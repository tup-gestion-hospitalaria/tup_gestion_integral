import {
  assertValidPatientPersistPayload,
  documentIndexId
} from './patient-schema.js';

export class FirestorePatientStoreError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export class FirestorePatientStore {
  constructor(db) {
    this.db = db;
    this.collection = db.collection('patients');
    this.documentIndex = db.collection('patientDocuments');
  }

  async listAll() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
  }

  async findById(id) {
    const document = await this.collection.doc(id).get();
    return document.exists ? { id: document.id, ...document.data() } : null;
  }

  async insert(id, data) {
    const reference = this.collection.doc(id);
    const { id: _ignored, ...payload } = data;
    assertValidPatientPersistPayload(payload);

    const documentKey = documentIndexId(payload.documentNumber);
    const indexRef = this.documentIndex.doc(documentKey);

    try {
      await this.db.runTransaction(async (transaction) => {
        const indexSnapshot = await transaction.get(indexRef);
        if (indexSnapshot.exists) {
          throw new FirestorePatientStoreError(
            'Ya existe un paciente con ese documento.',
            'DUPLICATE_DOCUMENT'
          );
        }

        transaction.set(indexRef, { patientId: id });
        transaction.set(reference, payload);
      });
    } catch (error) {
      if (error instanceof FirestorePatientStoreError) {
        throw error;
      }
      throw error;
    }

    return { id, ...payload };
  }

  async save(id, data) {
    const reference = this.collection.doc(id);
    const document = await reference.get();

    if (!document.exists) {
      return null;
    }

    const existing = document.data();
    const { id: _ignored, ...payload } = data;
    assertValidPatientPersistPayload(payload);

    const previousKey = documentIndexId(existing.documentNumber ?? '');
    const nextKey = documentIndexId(payload.documentNumber);
    const previousIndexRef =
      previousKey !== nextKey && previousKey
        ? this.documentIndex.doc(previousKey)
        : null;
    const nextIndexRef = this.documentIndex.doc(nextKey);

    try {
      await this.db.runTransaction(async (transaction) => {
        if (previousIndexRef) {
          transaction.delete(previousIndexRef);
        }

        if (nextKey !== previousKey) {
          const indexSnapshot = await transaction.get(nextIndexRef);
          if (indexSnapshot.exists && indexSnapshot.data()?.patientId !== id) {
            throw new FirestorePatientStoreError(
              'Ya existe un paciente con ese documento.',
              'DUPLICATE_DOCUMENT'
            );
          }
          transaction.set(nextIndexRef, { patientId: id });
        }

        transaction.set(reference, payload);
      });
    } catch (error) {
      if (error instanceof FirestorePatientStoreError) {
        throw error;
      }
      throw error;
    }

    return { id, ...payload };
  }
}
