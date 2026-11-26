/**
 * CORS Middleware con validación de orígenes permitidos.
 *
 * @param {Object} options
 * @param {string|string[]} [options.allowedOrigins] - Lista o string separado por comas de orígenes permitidos.
 *                                                     Si es '*', permite cualquier origen.
 */
export function createCorsMiddleware(options = {}) {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN;
  const configured = options.allowedOrigins ?? envOrigins ?? '*';

  let allowedList = [];
  let allowAll = false;

  if (Array.isArray(configured)) {
    allowedList = configured.map((o) => o.trim());
    allowAll = allowedList.includes('*');
  } else if (typeof configured === 'string') {
    if (configured === '*') {
      allowAll = true;
    } else {
      allowedList = configured
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    }
  }

  const allowedHeaders =
    options.allowedHeaders ??
    'Content-Type, Authorization, Idempotency-Key, X-Request-Id';
  const allowedMethods =
    options.allowedMethods ?? 'GET, POST, PUT, PATCH, DELETE, OPTIONS';

  return function corsMiddleware(request, response, next) {
    const origin = request.headers.origin;

    // Si no hay Origin en el request (ej. request server-to-server o same-origin), continuamos
    if (!origin) {
      return next();
    }

    const isAllowed = allowAll || allowedList.includes(origin);

    if (isAllowed) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Headers', allowedHeaders);
      response.setHeader('Access-Control-Allow-Methods', allowedMethods);
      response.setHeader('Access-Control-Max-Age', '86400');

      if (request.method === 'OPTIONS') {
        return response.sendStatus(204);
      }

      return next();
    }

    // Si el origen no está permitido y es preflight OPTIONS, rechazamos con 403
    if (request.method === 'OPTIONS') {
      return response.status(403).json({
        message: 'Origen no permitido por política CORS.'
      });
    }

    // Para requests normales de orígenes no permitidos, no agregamos header CORS
    response.setHeader('Vary', 'Origin');
    return response.status(403).json({
      message: 'Origen no permitido por política CORS.'
    });
  };
}
