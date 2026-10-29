import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createHealthsitesService,
  HealthsitesError
} from '../src/healthsites-service.js';

function jsonResponse(body, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => body
  };
}

test('normaliza la respuesta y envía la credencial solamente al proveedor', async () => {
  let requestedUrl;
  const service = createHealthsitesService({
    apiKey: 'server-only-secret',
    pageCount: 1,
    fetchImplementation: async (url) => {
      requestedUrl = url;
      return jsonResponse({
        results: [
          {
            id: 42,
            attributes: {
              name: ' Hospital San Martín ',
              'addr:city': 'La Plata',
              'addr:street': 'Calle 1',
              amenity: 'hospital'
            },
            centroid: { coordinates: ['-57.95', '-34.9'] }
          }
        ]
      });
    }
  });

  const result = await service.getHealthsites();

  assert.equal(requestedUrl.searchParams.get('api-key'), 'server-only-secret');
  assert.deepEqual(result, [
    {
      id: '42',
      name: 'Hospital San Martín',
      city: 'La Plata',
      address: 'Calle 1',
      type: 'hospital',
      latitude: -34.9,
      longitude: -57.95,
      googleMapsUrl: 'https://www.google.com/maps?q=-34.9,-57.95'
    }
  ]);
  assert.equal(JSON.stringify(result).includes('server-only-secret'), false);
});

test('reutiliza la caché y vuelve a consultar después de su expiración', async () => {
  let currentTime = 1_000;
  let requestCount = 0;
  const service = createHealthsitesService({
    apiKey: 'secret',
    pageCount: 1,
    cacheTtlMs: 5_000,
    now: () => currentTime,
    fetchImplementation: async () => {
      requestCount += 1;
      return jsonResponse([{ id: requestCount, name: `Centro ${requestCount}` }]);
    }
  });

  const firstResult = await service.getHealthsites();
  const cachedResult = await service.getHealthsites();

  assert.equal(requestCount, 1);
  assert.deepEqual(cachedResult, firstResult);

  currentTime += 5_000;
  const refreshedResult = await service.getHealthsites();

  assert.equal(requestCount, 2);
  assert.equal(refreshedResult[0].id, '2');
});

test('informa timeout cuando el proveedor excede el límite', async () => {
  const service = createHealthsitesService({
    apiKey: 'secret',
    pageCount: 1,
    timeoutMs: 10,
    fetchImplementation: async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      })
  });

  await assert.rejects(service.getHealthsites(), (error) => {
    assert.ok(error instanceof HealthsitesError);
    assert.equal(error.code, 'HEALTHSITES_TIMEOUT');
    assert.equal(error.statusCode, 504);
    return true;
  });
});

test('rechaza una respuesta inválida del proveedor', async () => {
  const service = createHealthsitesService({
    apiKey: 'secret',
    pageCount: 1,
    fetchImplementation: async () => jsonResponse({ results: {} })
  });

  await assert.rejects(service.getHealthsites(), (error) => {
    assert.ok(error instanceof HealthsitesError);
    assert.equal(error.code, 'HEALTHSITES_INVALID_RESPONSE');
    assert.equal(error.statusCode, 502);
    return true;
  });
});

test('informa indisponibilidad cuando el proveedor está caído', async () => {
  const service = createHealthsitesService({
    apiKey: 'secret',
    pageCount: 1,
    fetchImplementation: async () => jsonResponse(null, { ok: false, status: 503 })
  });

  await assert.rejects(service.getHealthsites(), (error) => {
    assert.ok(error instanceof HealthsitesError);
    assert.equal(error.code, 'HEALTHSITES_UNAVAILABLE');
    assert.equal(error.statusCode, 502);
    return true;
  });
});

test('no intenta consultar al proveedor si falta la credencial', async () => {
  let requested = false;
  const service = createHealthsitesService({
    apiKey: '',
    pageCount: 1,
    fetchImplementation: async () => {
      requested = true;
      return jsonResponse([]);
    }
  });

  await assert.rejects(service.getHealthsites(), (error) => {
    assert.equal(error.code, 'HEALTHSITES_NOT_CONFIGURED');
    assert.equal(error.statusCode, 503);
    return true;
  });
  assert.equal(requested, false);
});
