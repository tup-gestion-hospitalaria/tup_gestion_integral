import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import { createApp } from '../src/app.js';
import { PatientStore } from '../src/patient-store.js';
import { redact, createLogger } from '../src/middleware/logger.js';
import { createRateLimiter } from '../src/middleware/rate-limiter.js';

let baseUrl;
let server;
let currentApp;
let capturedLogs = [];

const testLogger = createLogger({
  writer: (line) => {
    try {
      capturedLogs.push(JSON.parse(line));
    } catch {
      capturedLogs.push(line);
    }
  }
});

const decodedTokens = {
  'user-token': {
    uid: 'user-1',
    email: 'user@example.com',
    name: 'Usuario de prueba',
    role: 'user',
    status: 'approved',
    active: true
  },
  'admin-token': {
    uid: 'admin-1',
    email: 'admin@example.com',
    name: 'Administrador de prueba',
    role: 'admin',
    status: 'approved',
    active: true
  }
};

async function verifyIdToken(token) {
  if (token === 'revoked-token') {
    const error = new Error('Token has been revoked');
    error.code = 'auth/id-token-revoked';
    throw error;
  }

  const decoded = decodedTokens[token];
  if (!decoded) {
    throw new Error('Token inválido');
  }
  return decoded;
}

before(async () => {
  currentApp = createApp(new PatientStore([]), {
    verifyIdToken,
    corsAllowedOrigins: ['http://localhost:4201', 'https://mi-hospital.com'],
    logger: testLogger,
    rateLimitOptions: {
      enabled: false
    }
  });

  server = currentApp.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
});

beforeEach(() => {
  capturedLogs = [];
});

test('GI-14: Security Headers están presentes y X-Powered-By está deshabilitado', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);

  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(
    response.headers.get('strict-transport-security'),
    /max-age=31536000/
  );
  assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(response.headers.get('permissions-policy'), /geolocation=\(\)/);
  assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
});

test('GI-14: CORS permite origen autorizado y responde preflight OPTIONS', async () => {
  // Solicitud normal con Origin permitido
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'http://localhost:4201' }
  });
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'http://localhost:4201'
  );
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');

  // Preflight OPTIONS con Origin permitido
  const preflightResponse = await fetch(`${baseUrl}/api/v1/patients`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://mi-hospital.com',
      'Access-Control-Request-Method': 'POST'
    }
  });
  assert.equal(preflightResponse.status, 204);
  assert.equal(
    preflightResponse.headers.get('access-control-allow-origin'),
    'https://mi-hospital.com'
  );
  assert.match(
    preflightResponse.headers.get('access-control-allow-methods'),
    /POST/
  );
});

test('GI-14: CORS rechaza origen no autorizado con 403', async () => {
  // Solicitud normal de origen malicioso
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'http://malicious-site.com' }
  });
  assert.equal(response.status, 403);
  const data = await response.json();
  assert.match(data.message, /CORS/);
  assert.equal(response.headers.get('access-control-allow-origin'), null);

  // Preflight OPTIONS de origen no autorizado
  const preflight = await fetch(`${baseUrl}/api/v1/patients`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://malicious-site.com' }
  });
  assert.equal(preflight.status, 403);
  assert.equal(preflight.headers.get('access-control-allow-origin'), null);
});

test('GI-14: Request ID asigna UUID si no existe y propaga X-Request-Id recibido', async () => {
  // Sin header previo: genera UUID
  const res1 = await fetch(`${baseUrl}/health`);
  const reqId1 = res1.headers.get('x-request-id');
  assert.ok(reqId1);
  assert.match(
    reqId1,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  );

  // Con header previo válido: propaga el recibido
  const customId = 'custom-trace-id-abc123';
  const res2 = await fetch(`${baseUrl}/health`, {
    headers: { 'X-Request-Id': customId }
  });
  assert.equal(res2.headers.get('x-request-id'), customId);
});

test('GI-14: Rate limiting controla solicitudes y retorna 429 con Retry-After', async () => {
  const rateLimitApp = createApp(new PatientStore([]), {
    rateLimiter: createRateLimiter({
      windowMs: 2000,
      max: 2,
      keyGenerator: () => 'test-ip-key'
    })
  });
  const customServer = rateLimitApp.listen(0);
  await new Promise((resolve) => customServer.once('listening', resolve));
  const port = customServer.address().port;
  const url = `http://127.0.0.1:${port}/health`;

  try {
    const res1 = await fetch(url);
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('ratelimit-remaining'), '1');

    const res2 = await fetch(url);
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get('ratelimit-remaining'), '0');

    // 3ra solicitud: supera el límite de 2
    const res3 = await fetch(url);
    assert.equal(res3.status, 429);
    assert.ok(res3.headers.get('retry-after'));
    const body = await res3.json();
    assert.match(body.message, /Demasiadas solicitudes/);
  } finally {
    customServer.close();
  }
});

test('GI-14: Redacción de datos sensibles en objetos y logs estructurados', () => {
  const sensitivePayload = {
    user: 'admin',
    password: 'SuperSecretPassword123',
    token: 'eyJhbGciOi...',
    authorization: 'Bearer secret_token_xyz',
    apiKey: 'hs_live_12345',
    patient: {
      name: 'Juan Pérez',
      dni: '12345678',
      documentNumber: '12345678',
      email: 'juan@example.com',
      phone: '+54911000000',
      medicalRecord: 'Historia confidencial'
    }
  };

  const redacted = redact(sensitivePayload);

  assert.equal(redacted.user, 'admin');
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.token, '[REDACTED]');
  assert.equal(redacted.authorization, '[REDACTED]');
  assert.equal(redacted.apiKey, '[REDACTED]');
  assert.equal(redacted.patient.dni, '[REDACTED]');
  assert.equal(redacted.patient.documentNumber, '[REDACTED]');
  assert.equal(redacted.patient.email, '[REDACTED]');
  assert.equal(redacted.patient.phone, '[REDACTED]');
  assert.equal(redacted.patient.medicalRecord, '[REDACTED]');
  assert.equal(redacted.patient.name, 'Juan Pérez');
});

test('GI-14: Errores devuelven 400 para JSON inválido y 413 para payload excesivo', async () => {
  // JSON inválido -> 400
  const malformedRes = await fetch(`${baseUrl}/api/v1/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token'
    },
    body: '{"invalidJson: true'
  });
  assert.equal(malformedRes.status, 400);
  const malformedData = await malformedRes.json();
  assert.equal(malformedData.message, 'JSON inválido.');

  // Payload excesivo (> 8kb) -> 413
  const hugeBody = JSON.stringify({ data: 'A'.repeat(9000) });
  const hugeRes = await fetch(`${baseUrl}/api/v1/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token'
    },
    body: hugeBody
  });
  assert.equal(hugeRes.status, 413);
  const hugeData = await hugeRes.json();
  assert.equal(hugeData.message, 'El cuerpo de la solicitud es demasiado grande.');
});

test('GI-14: Detección y rechazo de tokens revocados con 401 TOKEN_REVOKED', async () => {
  const response = await fetch(`${baseUrl}/api/v1/patients`, {
    headers: {
      Authorization: 'Bearer revoked-token'
    }
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, 'TOKEN_REVOKED');
  assert.match(body.message, /revocado/i);
});
