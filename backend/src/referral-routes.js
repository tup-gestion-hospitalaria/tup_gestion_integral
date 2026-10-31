import {
  parseReferralListQuery,
  validateIdempotencyKey,
  validateReferralCreateInput,
  validateReferralPatchInput,
  validateTransitionInput
} from './referral-schema.js';
import { ReferralService, ReferralServiceError } from './referral-service.js';

function handleReferralServiceError(error, response) {
  if (error instanceof ReferralServiceError) {
    return response.status(error.status).json({
      message: error.message,
      code: error.code
    });
  }

  throw error;
}

export function registerReferralRoutes(app, { referralService, allowAuthenticatedUsers }) {
  const listReferralsHandler = async (request, response, next) => {
    try {
      const parsed = parseReferralListQuery(request.query);
      if (!parsed.ok) {
        return response.status(400).json({ message: parsed.message });
      }

      const referrals = await referralService.list(parsed.value, request.user);
      response.json(referrals);
    } catch (error) {
      try {
        handleReferralServiceError(error, response);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  };

  const getReferralHandler = async (request, response, next) => {
    try {
      const referral = await referralService.getById(request.params.id, request.user);
      if (!referral) {
        return response.status(404).json({ message: 'Derivación no encontrada.' });
      }

      response.json(referral);
    } catch (error) {
      try {
        handleReferralServiceError(error, response);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  };

  const createReferralHandler = async (request, response, next) => {
    try {
      const validation = validateReferralCreateInput(request.body);
      if (!validation.ok) {
        return response.status(400).json({ message: validation.message });
      }

      const idempotency = validateIdempotencyKey(request.get('Idempotency-Key'));
      if (!idempotency.ok) {
        return response.status(400).json({ message: idempotency.message });
      }

      const result = await referralService.create(validation.value, request.user, {
        idempotencyKey: idempotency.value
      });

      response.status(result.replay ? 200 : 201).json(result.referral);
    } catch (error) {
      try {
        handleReferralServiceError(error, response);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  };

  const patchReferralHandler = async (request, response, next) => {
    try {
      const validation = validateReferralPatchInput(request.body);
      if (!validation.ok) {
        return response.status(400).json({ message: validation.message });
      }

      const referral = await referralService.patch(
        request.params.id,
        validation.value,
        request.user
      );
      if (!referral) {
        return response.status(404).json({ message: 'Derivación no encontrada.' });
      }

      response.json(referral);
    } catch (error) {
      try {
        handleReferralServiceError(error, response);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  };

  const deleteReferralHandler = async (request, response, next) => {
    try {
      const deleted = await referralService.deleteDraft(request.params.id, request.user);
      if (!deleted) {
        return response.status(404).json({ message: 'Derivación no encontrada.' });
      }

      response.sendStatus(204);
    } catch (error) {
      try {
        handleReferralServiceError(error, response);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  };

  const transitionReferralHandler = async (request, response, next) => {
    try {
      const validation = validateTransitionInput(request.body);
      if (!validation.ok) {
        return response.status(400).json({ message: validation.message });
      }

      const referral = await referralService.transition(
        request.params.id,
        validation.value,
        request.user
      );
      if (!referral) {
        return response.status(404).json({ message: 'Derivación no encontrada.' });
      }

      response.json(referral);
    } catch (error) {
      try {
        handleReferralServiceError(error, response);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  };

  for (const prefix of ['/api/referrals', '/api/v1/referrals']) {
    app.get(prefix, allowAuthenticatedUsers, listReferralsHandler);
    app.get(`${prefix}/:id`, allowAuthenticatedUsers, getReferralHandler);
    app.post(prefix, allowAuthenticatedUsers, createReferralHandler);
    app.patch(`${prefix}/:id`, allowAuthenticatedUsers, patchReferralHandler);
    app.delete(`${prefix}/:id`, allowAuthenticatedUsers, deleteReferralHandler);
    app.post(
      `${prefix}/:id/transitions`,
      allowAuthenticatedUsers,
      transitionReferralHandler
    );
  }
}

export function createReferralService(options) {
  const {
    referralStore,
    patientService,
    userStore
  } = options;

  return new ReferralService(referralStore, patientService, userStore);
}
