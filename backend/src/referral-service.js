import { createHash } from 'node:crypto';

import {
  buildCreateBodyFingerprint,
  isAllowedTransition,
  normalizeStoredReferral,
  openLockKey,
  OPEN_REFERRAL_STATUSES,
  referralToResponse,
  transitionAction
} from './referral-schema.js';

export class ReferralServiceError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function hashBodyFingerprint(fingerprint) {
  return createHash('sha256').update(fingerprint).digest('hex');
}

function buildEvent(store, { action, actorId, fromStatus, toStatus, changes, at }) {
  return {
    id: store.createEventId(),
    action,
    at: at ?? new Date().toISOString(),
    actorId,
    fromStatus,
    toStatus,
    changes: changes ?? null
  };
}

export class ReferralService {
  constructor(referralStore, patientService, userStore) {
    this.store = referralStore;
    this.patientService = patientService;
    this.userStore = userStore;
  }

  canView(referral, actor) {
    if (actor.role === 'admin') {
      return true;
    }

    return (
      referral.createdBy === actor.uid || referral.responsibleId === actor.uid
    );
  }

  isOwner(referral, actorId) {
    return referral.createdBy === actorId;
  }

  async assertPatientReferrable(patientId) {
    const patient = await this.patientService.getById(patientId);
    if (!patient) {
      throw new ReferralServiceError(404, 'Paciente no encontrado.', 'PATIENT_NOT_FOUND');
    }

    if (patient.active === false) {
      throw new ReferralServiceError(
        409,
        'No se puede derivar a un paciente inactivo.',
        'PATIENT_INACTIVE'
      );
    }

    return patient;
  }

  async assertResponsibleUser(responsibleId, actor) {
    const uid = responsibleId ?? actor.uid;

    if (actor.role !== 'admin' && uid !== actor.uid) {
      throw new ReferralServiceError(
        403,
        'Solo podés asignarte a vos mismo como responsable.',
        'FORBIDDEN_RESPONSIBLE'
      );
    }

    const user = await this.userStore.findById(uid);
    if (!user) {
      throw new ReferralServiceError(404, 'Usuario responsable no encontrado.', 'USER_NOT_FOUND');
    }

    if (user.status !== 'approved' || user.active === false) {
      throw new ReferralServiceError(
        409,
        'El usuario responsable debe estar aprobado y activo.',
        'RESPONSIBLE_NOT_APPROVED'
      );
    }

    return uid;
  }

  async findDuplicateOpen(patientId, healthsiteId) {
    const referrals = await this.store.listAll();
    return referrals.find(
      (referral) =>
        referral.patientId === patientId &&
        referral.destination?.healthsiteId === healthsiteId &&
        OPEN_REFERRAL_STATUSES.includes(referral.status)
    );
  }

  async create(input, actor, { idempotencyKey = null } = {}) {
    await this.assertPatientReferrable(input.patientId);
    const responsibleId = await this.assertResponsibleUser(input.responsibleId, actor);

    const fingerprint = buildCreateBodyFingerprint({
      ...input,
      responsibleId: input.responsibleId ?? null
    });
    const bodyHash = hashBodyFingerprint(fingerprint);

    if (idempotencyKey) {
      const existingRecord = await this.store.getIdempotency(actor.uid, idempotencyKey);
      if (existingRecord) {
        if (existingRecord.bodyHash !== bodyHash) {
          throw new ReferralServiceError(
            409,
            'La clave de idempotencia ya fue usada con otro cuerpo.',
            'IDEMPOTENCY_MISMATCH'
          );
        }

        const existingReferral = normalizeStoredReferral(
          await this.store.findById(existingRecord.referralId)
        );
        if (!existingReferral) {
          throw new ReferralServiceError(
            409,
            'La derivación asociada a la clave de idempotencia no existe.',
            'IDEMPOTENCY_BROKEN'
          );
        }

        return { referral: existingReferral, replay: true };
      }
    }

    const duplicate = await this.findDuplicateOpen(
      input.patientId,
      input.destination.healthsiteId
    );
    if (duplicate) {
      throw new ReferralServiceError(
        409,
        'Ya existe una derivación abierta para este paciente y centro.',
        'DUPLICATE_REFERRAL'
      );
    }

    const now = new Date().toISOString();
    const id = this.store.createReferralId();
    const lockKey = openLockKey(input.patientId, input.destination.healthsiteId);

    const referral = {
      id,
      patientId: input.patientId,
      destination: input.destination,
      reason: input.reason,
      notes: input.notes,
      priority: input.priority,
      responsibleId,
      status: 'draft',
      rejectionReason: null,
      createdAt: now,
      createdBy: actor.uid,
      updatedAt: now,
      updatedBy: actor.uid,
      submittedAt: null,
      decidedAt: null,
      closedAt: null
    };

    const initialEvent = buildEvent(this.store, {
      action: 'referral.created',
      actorId: actor.uid,
      fromStatus: null,
      toStatus: 'draft',
      changes: {
        patientId: referral.patientId,
        destination: referral.destination,
        priority: referral.priority,
        responsibleId: referral.responsibleId
      },
      at: now
    });

    try {
      await this.store.createReferralAtomic({
        referral,
        initialEvent,
        lockKey,
        idempotencyRecord: idempotencyKey
          ? {
              userId: actor.uid,
              key: idempotencyKey,
              bodyHash
            }
          : null
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_REFERRAL') {
        throw new ReferralServiceError(409, error.message, 'DUPLICATE_REFERRAL');
      }
      throw error;
    }

    return { referral: normalizeStoredReferral(referral), replay: false };
  }

  async list(query, actor) {
    let referrals = (await this.store.listAll()).map((item) =>
      normalizeStoredReferral(item)
    );

    if (actor.role !== 'admin') {
      referrals = referrals.filter((referral) => this.canView(referral, actor));
    }

    if (query.patientId) {
      referrals = referrals.filter((referral) => referral.patientId === query.patientId);
    }

    if (query.status) {
      referrals = referrals.filter((referral) => referral.status === query.status);
    }

    referrals.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return referrals.map((referral) => referralToResponse(referral));
  }

  async getById(id, actor) {
    const referral = normalizeStoredReferral(await this.store.findById(id));
    if (!referral) {
      return null;
    }

    if (!this.canView(referral, actor)) {
      throw new ReferralServiceError(
        403,
        'No tenés permisos para ver esta derivación.',
        'FORBIDDEN'
      );
    }

    const history = await this.store.listEvents(id);
    return referralToResponse(referral, { includeHistory: true, history });
  }

  async patch(id, input, actor) {
    const existing = normalizeStoredReferral(await this.store.findById(id));
    if (!existing) {
      return null;
    }

    if (existing.status !== 'draft') {
      throw new ReferralServiceError(
        409,
        'Solo se puede editar una derivación en borrador.',
        'NOT_DRAFT'
      );
    }

    if (actor.role !== 'admin' && !this.isOwner(existing, actor.uid)) {
      throw new ReferralServiceError(
        403,
        'No tenés permisos para editar esta derivación.',
        'FORBIDDEN'
      );
    }

    let responsibleId = existing.responsibleId;
    if (input.responsibleId !== undefined) {
      responsibleId = await this.assertResponsibleUser(input.responsibleId, actor);
    }

    const now = new Date().toISOString();
    const nextDestination = input.destination ?? existing.destination;
    const nextLockKey = openLockKey(existing.patientId, nextDestination.healthsiteId);
    const previousLockKey = openLockKey(
      existing.patientId,
      existing.destination.healthsiteId
    );
    const destinationChanged =
      nextDestination.healthsiteId !== existing.destination.healthsiteId;

    if (destinationChanged) {
      const duplicate = await this.findDuplicateOpen(
        existing.patientId,
        nextDestination.healthsiteId
      );
      if (duplicate && duplicate.id !== id) {
        throw new ReferralServiceError(
          409,
          'Ya existe una derivación abierta para este paciente y centro.',
          'DUPLICATE_REFERRAL'
        );
      }
    }

    const referral = {
      ...existing,
      ...input,
      destination: nextDestination,
      responsibleId,
      updatedAt: now,
      updatedBy: actor.uid
    };

    const event = buildEvent(this.store, {
      action: 'referral.updated',
      actorId: actor.uid,
      fromStatus: existing.status,
      toStatus: existing.status,
      changes: input
    });

    try {
      await this.store.updateReferralAtomic({
        referral,
        event,
        deleteLockKey: destinationChanged ? previousLockKey : null,
        createLockKey: destinationChanged ? nextLockKey : null
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_REFERRAL') {
        throw new ReferralServiceError(409, error.message, 'DUPLICATE_REFERRAL');
      }
      throw error;
    }

    return normalizeStoredReferral(referral);
  }

  assertTransitionPermission(referral, toStatus, actor) {
    const adminOnly = ['accepted', 'rejected', 'completed'];
    if (adminOnly.includes(toStatus) && actor.role !== 'admin') {
      throw new ReferralServiceError(
        403,
        'No tenés permisos para realizar esta transición.',
        'FORBIDDEN'
      );
    }

    const ownerOrAdmin = ['submitted', 'cancelled'];
    if (
      ownerOrAdmin.includes(toStatus) &&
      actor.role !== 'admin' &&
      !this.isOwner(referral, actor.uid)
    ) {
      throw new ReferralServiceError(
        403,
        'No tenés permisos para realizar esta transición.',
        'FORBIDDEN'
      );
    }
  }

  applyStatusTimestamps(referral, toStatus, now, actorId) {
    const next = { ...referral, status: toStatus, updatedAt: now, updatedBy: actorId };

    if (toStatus === 'submitted') {
      next.submittedAt = now;
    }
    if (toStatus === 'accepted' || toStatus === 'rejected') {
      next.decidedAt = now;
    }
    if (toStatus === 'rejected' || toStatus === 'completed' || toStatus === 'cancelled') {
      next.closedAt = now;
    }

    return next;
  }

  async transition(id, input, actor) {
    const existing = normalizeStoredReferral(await this.store.findById(id));
    if (!existing) {
      return null;
    }

    if (!this.canView(existing, actor) && actor.role !== 'admin') {
      throw new ReferralServiceError(
        403,
        'No tenés permisos para modificar esta derivación.',
        'FORBIDDEN'
      );
    }

    const { to, rejectionReason } = input;

    if (!isAllowedTransition(existing.status, to)) {
      throw new ReferralServiceError(
        409,
        `La transición de ${existing.status} a ${to} no está permitida.`,
        'INVALID_TRANSITION'
      );
    }

    this.assertTransitionPermission(existing, to, actor);

    const now = new Date().toISOString();
    let referral = this.applyStatusTimestamps(existing, to, now, actor.uid);

    if (to === 'rejected') {
      referral.rejectionReason = rejectionReason;
    }

    const action = transitionAction(to);
    const event = buildEvent(this.store, {
      action,
      actorId: actor.uid,
      fromStatus: existing.status,
      toStatus: to,
      changes: to === 'rejected' ? { rejectionReason } : null
    });

    const lockKey = openLockKey(existing.patientId, existing.destination.healthsiteId);
    const deleteLockKey = ['rejected', 'completed', 'cancelled'].includes(to)
      ? lockKey
      : null;

    await this.store.updateReferralAtomic({
      referral,
      event,
      deleteLockKey
    });

    return normalizeStoredReferral(referral);
  }

  async deleteDraft(id, actor) {
    const existing = normalizeStoredReferral(await this.store.findById(id));
    if (!existing) {
      return null;
    }

    if (existing.status !== 'draft') {
      throw new ReferralServiceError(
        409,
        'Solo se puede eliminar una derivación en borrador.',
        'NOT_DRAFT'
      );
    }

    if (actor.role !== 'admin' && !this.isOwner(existing, actor.uid)) {
      throw new ReferralServiceError(
        403,
        'No tenés permisos para eliminar esta derivación.',
        'FORBIDDEN'
      );
    }

    const lockKey = openLockKey(existing.patientId, existing.destination.healthsiteId);
    await this.store.deleteDraftAtomic({ referralId: id, lockKey });
    return true;
  }
}
