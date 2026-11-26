import crypto from 'node:crypto';

const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Middleware para asignar o propagar un ID único por solicitud (Request ID).
 */
export function requestId() {
  return function requestIdMiddleware(request, response, next) {
    const incomingId = request.headers['x-request-id'];
    const validId =
      typeof incomingId === 'string' && SAFE_REQUEST_ID_REGEX.test(incomingId)
        ? incomingId
        : crypto.randomUUID();

    request.id = validId;
    response.setHeader('X-Request-Id', validId);

    next();
  };
}
