/**
 * In-memory Rate Limiter Middleware.
 *
 * @param {Object} options
 * @param {number} [options.windowMs=900000] - Ventana de tiempo en milisegundos (15 min por defecto).
 * @param {number} [options.max=100] - Máximo número de solicitudes permitidas por ventana.
 * @param {string} [options.message] - Mensaje de error al superar el límite.
 * @param {Function} [options.keyGenerator] - Función para extraer la clave del cliente (por defecto IP).
 * @param {Function} [options.skip] - Función (request) => boolean para saltear el limitador.
 * @param {boolean} [options.enabled=true] - Si está habilitado o deshabilitado.
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const max = options.max ?? 100;
  const message =
    options.message ??
    'Demasiadas solicitudes. Por favor intente nuevamente más tarde.';
  const keyGenerator =
    options.keyGenerator ??
    ((request) =>
      request.ip ||
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      'unknown');
  const skip = options.skip ?? (() => false);
  const enabled = options.enabled !== false;

  const hits = new Map();

  // Limpieza periódica de registros vencidos cada ventana de tiempo
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 60000));

  if (interval.unref) {
    interval.unref();
  }

  function rateLimiterMiddleware(request, response, next) {
    if (!enabled || skip(request)) {
      return next();
    }

    const key = keyGenerator(request);
    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    response.setHeader('RateLimit-Limit', max);
    response.setHeader('RateLimit-Remaining', remaining);
    response.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      response.setHeader('Retry-After', resetSeconds);
      return response.status(429).json({ message });
    }

    next();
  }

  rateLimiterMiddleware.reset = () => {
    hits.clear();
  };

  rateLimiterMiddleware.destroy = () => {
    clearInterval(interval);
    hits.clear();
  };

  return rateLimiterMiddleware;
}
