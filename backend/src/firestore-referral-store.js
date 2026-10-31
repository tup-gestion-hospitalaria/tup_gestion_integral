import { randomUUID } from 'node:crypto';

export class FirestoreReferralStore {
  constructor(db) {
    this.db = db;
    this.referrals = db.collection('referrals');
    this.locks = db.collection('referralOpenLocks');
    this.idempotency = db.collection('referralIdempotency');
  }

  async listAll() {
    const snapshot = await this.referrals.get();
    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
  }

  async findById(id) {
    const document = await this.referrals.doc(id).get();
    return document.exists ? { id: document.id, ...document.data() } : null;
  }

  async listEvents(referralId) {
    const snapshot = await this.referrals.doc(referralId).collection('events').get();
    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
  }

  async lockExists(lockKey) {
    const document = await this.locks.doc(lockKey).get();
    return document.exists;
  }

  idempotencyDocId(userId, key) {
    return `${userId}__${key}`;
  }

  async getIdempotency(userId, key) {
    const document = await this.idempotency
      .doc(this.idempotencyDocId(userId, key))
      .get();
    return document.exists ? document.data() : null;
  }

  async saveIdempotency(userId, key, bodyHash, referralId) {
    await this.idempotency.doc(this.idempotencyDocId(userId, key)).set({
      userId,
      key,
      bodyHash,
      referralId
    });
  }

  async createReferralAtomic({ referral, initialEvent, lockKey, idempotencyRecord }) {
    const referralRef = this.referrals.doc(referral.id);
    const lockRef = this.locks.doc(lockKey);
    const eventRef = referralRef.collection('events').doc(initialEvent.id);

    await this.db.runTransaction(async (transaction) => {
      const lockSnap = await transaction.get(lockRef);
      if (lockSnap.exists) {
        const error = new Error('Ya existe una derivación abierta para este paciente y centro.');
        error.code = 'DUPLICATE_REFERRAL';
        throw error;
      }

      if (idempotencyRecord) {
        const idempotencyRef = this.idempotency.doc(
          this.idempotencyDocId(idempotencyRecord.userId, idempotencyRecord.key)
        );
        const idempotencySnap = await transaction.get(idempotencyRef);
        if (idempotencySnap.exists) {
          const error = new Error('La clave de idempotencia ya fue utilizada.');
          error.code = 'IDEMPOTENCY_CONFLICT';
          throw error;
        }
        transaction.set(idempotencyRef, {
          userId: idempotencyRecord.userId,
          key: idempotencyRecord.key,
          bodyHash: idempotencyRecord.bodyHash,
          referralId: referral.id
        });
      }

      const { id: _ignored, ...payload } = referral;
      transaction.set(referralRef, payload);
      transaction.set(lockRef, {
        referralId: referral.id,
        patientId: referral.patientId,
        healthsiteId: referral.destination.healthsiteId,
        createdAt: referral.createdAt
      });
      const { id: _eventId, ...eventPayload } = initialEvent;
      transaction.set(eventRef, eventPayload);
    });
  }

  async updateReferralAtomic({ referral, event, deleteLockKey, createLockKey }) {
    const referralRef = this.referrals.doc(referral.id);
    const eventRef = referralRef.collection('events').doc(event.id);
    const deleteLockRef = deleteLockKey ? this.locks.doc(deleteLockKey) : null;
    const createLockRef = createLockKey ? this.locks.doc(createLockKey) : null;

    let updated = false;

    await this.db.runTransaction(async (transaction) => {
      const referralSnap = await transaction.get(referralRef);
      if (!referralSnap.exists) {
        return;
      }

      if (createLockRef) {
        const createLockSnap = await transaction.get(createLockRef);
        if (createLockSnap.exists) {
          const error = new Error(
            'Ya existe una derivación abierta para este paciente y centro.'
          );
          error.code = 'DUPLICATE_REFERRAL';
          throw error;
        }
      }

      const { id: _ignored, ...payload } = referral;
      transaction.set(referralRef, payload);
      const { id: _eventId, ...eventPayload } = event;
      transaction.set(eventRef, eventPayload);

      if (deleteLockRef) {
        transaction.delete(deleteLockRef);
      }

      if (createLockRef) {
        transaction.set(createLockRef, {
          referralId: referral.id,
          patientId: referral.patientId,
          healthsiteId: referral.destination.healthsiteId,
          createdAt: referral.updatedAt
        });
      }

      updated = true;
    });

    return updated;
  }

  async deleteDraftAtomic({ referralId, lockKey }) {
    const referralRef = this.referrals.doc(referralId);
    const lockRef = this.locks.doc(lockKey);

    let deleted = false;

    await this.db.runTransaction(async (transaction) => {
      const referralSnap = await transaction.get(referralRef);
      if (!referralSnap.exists) {
        return;
      }

      const eventsSnap = await transaction.get(referralRef.collection('events'));
      for (const eventDoc of eventsSnap.docs) {
        transaction.delete(eventDoc.ref);
      }

      transaction.delete(referralRef);
      transaction.delete(lockRef);
      deleted = true;
    });

    return deleted;
  }

  createEventId() {
    return randomUUID();
  }

  createReferralId() {
    return randomUUID();
  }
}
