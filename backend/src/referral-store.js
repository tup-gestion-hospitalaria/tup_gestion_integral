import { randomUUID } from 'node:crypto';

export class ReferralStore {
  constructor() {
    this.referrals = new Map();
    this.events = new Map();
    this.locks = new Set();
    this.idempotency = new Map();
  }

  async listAll() {
    return [...this.referrals.values()].map((item) => structuredClone(item));
  }

  async findById(id) {
    const referral = this.referrals.get(id);
    return referral ? structuredClone(referral) : null;
  }

  async listEvents(referralId) {
    const events = this.events.get(referralId) ?? [];
    return events.map((event) => structuredClone(event));
  }

  async lockExists(lockKey) {
    return this.locks.has(lockKey);
  }

  async getIdempotency(userId, key) {
    const record = this.idempotency.get(`${userId}::${key}`);
    return record ? structuredClone(record) : null;
  }

  async saveIdempotency(userId, key, bodyHash, referralId) {
    this.idempotency.set(`${userId}::${key}`, {
      userId,
      key,
      bodyHash,
      referralId
    });
  }

  async createReferralAtomic({ referral, initialEvent, lockKey, idempotencyRecord }) {
    if (this.locks.has(lockKey)) {
      const error = new Error('Ya existe una derivación abierta para este paciente y centro.');
      error.code = 'DUPLICATE_REFERRAL';
      throw error;
    }

    this.referrals.set(referral.id, structuredClone(referral));
    this.events.set(referral.id, [structuredClone(initialEvent)]);
    this.locks.add(lockKey);

    if (idempotencyRecord) {
      await this.saveIdempotency(
        idempotencyRecord.userId,
        idempotencyRecord.key,
        idempotencyRecord.bodyHash,
        referral.id
      );
    }
  }

  async updateReferralAtomic({ referral, event, deleteLockKey, createLockKey }) {
    if (!this.referrals.has(referral.id)) {
      return false;
    }

    if (createLockKey && this.locks.has(createLockKey)) {
      const error = new Error('Ya existe una derivación abierta para este paciente y centro.');
      error.code = 'DUPLICATE_REFERRAL';
      throw error;
    }

    this.referrals.set(referral.id, structuredClone(referral));
    const existingEvents = this.events.get(referral.id) ?? [];
    existingEvents.push(structuredClone(event));
    this.events.set(referral.id, existingEvents);

    if (deleteLockKey) {
      this.locks.delete(deleteLockKey);
    }

    if (createLockKey) {
      this.locks.add(createLockKey);
    }

    return true;
  }

  async deleteDraftAtomic({ referralId, lockKey }) {
    const referral = this.referrals.get(referralId);
    if (!referral) {
      return false;
    }

    this.referrals.delete(referralId);
    this.events.delete(referralId);
    this.locks.delete(lockKey);
    return true;
  }

  createEventId() {
    return randomUUID();
  }

  createReferralId() {
    return randomUUID();
  }
}
