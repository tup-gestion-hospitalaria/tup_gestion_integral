const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'token',
  'idtoken',
  'refreshtoken',
  'password',
  'secret',
  'key',
  'apikey',
  'dni',
  'documentnumber',
  'phone',
  'telephone',
  'email',
  'medicalrecord',
  'birthdate'
]);

/**
 * Redacta valores sensibles de un objeto de forma recursiva sin mutar el original.
 *
 * @param {any} value
 * @param {number} [depth=0]
 * @returns {any}
 */
export function redact(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Redactar tokens Bearer en cadenas
    if (/bearer\s+[a-zA-Z0-9._-]+/i.test(value)) {
      return value.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redact(val, depth + 1);
      }
    }
    return result;
  }

  return value;
}

/**
 * Crea un logger estructurado con redacción de datos sensibles.
 *
 * @param {Object} options
 * @param {Function} [options.writer] - Función de salida (por defecto console.log).
 * @param {boolean} [options.silent=false] - Si es true, suprime salida.
 */
export function createLogger(options = {}) {
  const writer = options.writer ?? ((line) => console.log(line));
  const silent = options.silent ?? false;

  function log(level, message, meta = {}) {
    if (silent) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? redact(message) : undefined,
      ...(typeof message === 'object' ? redact(message) : {}),
      ...redact(meta)
    };

    writer(JSON.stringify(entry));
  }

  return {
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    redact
  };
}

/**
 * Middleware HTTP para registro de solicitudes con Request ID y métricas.
 *
 * @param {Object} options
 * @param {ReturnType<typeof createLogger>} [options.logger]
 */
export function requestLogger(options = {}) {
  const logger = options.logger ?? createLogger(options);

  return function requestLoggerMiddleware(request, response, next) {
    const start = Date.now();

    response.on('finish', () => {
      const durationMs = Date.now() - start;
      const statusCode = response.statusCode;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      // Redactar query params sensibles de la URL
      let cleanUrl = request.originalUrl || request.url;
      try {
        const parsed = new URL(cleanUrl, 'http://localhost');
        for (const [key] of parsed.searchParams) {
          if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            parsed.searchParams.set(key, '[REDACTED]');
          }
        }
        cleanUrl = parsed.pathname + parsed.search;
      } catch {
        // En caso de URL relativa simple sin formato complejo
      }

      logger[level]('HTTP_REQUEST', {
        requestId: request.id,
        method: request.method,
        url: cleanUrl,
        statusCode,
        durationMs
      });
    });

    next();
  };
}
