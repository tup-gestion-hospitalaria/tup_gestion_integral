import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createApp } from '../src/app.js';
import { PatientStore } from '../src/patient-store.js';

const auditFields = {
  version: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'system',
  updatedBy: 'system',
  deletedAt: null,
  deletedBy: null
};

const initialPatient = {
  id: 'patient-1',
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  city: 'La Plata',
  country: 'Argentina',
  picture: 'https://example.com/ana.jpg',
  active: true,
  ...auditFields
};

const healthsites = [
  {
    id: 'healthsite-1',
    name: 'Hospital de prueba',
    city: 'La Plata',
    address: 'Calle 1',
    type: 'hospital',
    latitude: -34.9,
    longitude: -57.95,
    googleMapsUrl: 'https://www.google.com/maps?q=-34.9,-57.95'
  }
];

let baseUrl;
let server;

const decodedTokens = {
  'user-token': {
    uid: 'user-1',
    email: 'user@example.com',
    name: 'Usuario de prueba',
    role: 'user'
  },
  'admin-token': {
    uid: 'admin-1',
    email: 'admin@example.com',
    name: 'Administrador de prueba',
    role: 'admin'
  }
};

async function verifyIdToken(token) {
  const decodedToken = decodedTokens[token];

  if (!decodedToken) {
    throw new Error('Token inválido');
  }

  return decodedToken;
}

function authHeaders(role = 'admin') {
  return { Authorization: `Bearer ${role}-token` };
}

before(async () => {
  const app = createApp(new PatientStore([initialPatient]), {
    verifyIdToken,
    healthsitesService: {
      getHealthsites: async () => healthsites
    }
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
});

test('GET devuelve pacientes paginados', async () => {
  const response = await fetch(`${baseUrl}/api/patients`, {
    headers: authHeaders('user')
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.page, 1);
  assert.equal(body.limit, 20);
  assert.equal(body.total, 1);
  assert.deepEqual(body.items, [initialPatient]);
});

test('GET devuelve un paciente por id y 404 si no existe', async () => {
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    headers: authHeaders('user')
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), initialPatient);

  const missingResponse = await fetch(`${baseUrl}/api/patients/missing`, {
    headers: authHeaders('user')
  });
  assert.equal(missingResponse.status, 404);
});

test('POST crea un paciente con auditoría y normalización', async () => {
  const newPatient = {
    fullName: '  Juan   López  ',
    email: 'JUAN@EXAMPLE.COM',
    city: 'Berisso',
    country: 'Argentina',
    picture: 'https://example.com/juan.jpg',
    active: true
  };
  const response = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(newPatient)
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.ok(body.id);
  assert.equal(body.fullName, 'Juan López');
  assert.equal(body.email, 'juan@example.com');
  assert.equal(body.version, 1);
  assert.equal(body.createdBy, 'admin-1');
  assert.equal(body.updatedBy, 'admin-1');
  assert.equal(body.deletedAt, null);
});

test('PUT reemplaza completamente un paciente con control de versión', async () => {
  const replacement = {
    fullName: 'Ana Gómez',
    email: 'ana.gomez@example.com',
    city: 'Ensenada',
    country: 'Argentina',
    picture: 'https://example.com/ana-gomez.jpg',
    active: false,
    version: 1
  };
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(replacement)
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.version, 2);
  assert.equal(body.active, false);
  assert.equal(body.updatedBy, 'admin-1');
});

test('PATCH modifica propiedades enviadas y exige versión', async () => {
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ active: true, version: 2 })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.active, true);
  assert.equal(body.fullName, 'Ana Gómez');
  assert.equal(body.version, 3);
});

test('DELETE aplica baja lógica y restauración la revierte', async () => {
  const createResponse = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      fullName: 'Paciente Temporal',
      email: 'temporal@example.com',
      city: 'La Plata',
      country: 'Argentina',
      picture: 'https://example.com/temporal.jpg',
      active: true
    })
  });
  const created = await createResponse.json();

  const deleteResponse = await fetch(
    `${baseUrl}/api/patients/${created.id}?version=${created.version}`,
    {
      method: 'DELETE',
      headers: authHeaders()
    }
  );
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await fetch(`${baseUrl}/api/patients/${created.id}`, {
    headers: authHeaders('user')
  });
  assert.equal(missingResponse.status, 404);

  const listResponse = await fetch(`${baseUrl}/api/patients`, {
    headers: authHeaders('user')
  });
  const listBody = await listResponse.json();
  assert.equal(
    listBody.items.some((patient) => patient.id === created.id),
    false
  );

  const restoreResponse = await fetch(
    `${baseUrl}/api/patients/${created.id}/restore`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ version: created.version + 1 })
    }
  );
  assert.equal(restoreResponse.status, 200);
  const restored = await restoreResponse.json();
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.version, created.version + 2);
});

test('rechaza entradas inválidas y conflictos', async () => {
  const incompleteResponse = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ fullName: 'Incompleto' })
  });
  assert.equal(incompleteResponse.status, 400);

  const unknownResponse = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ role: 'admin', version: 3 })
  });
  assert.equal(unknownResponse.status, 400);

  const duplicateResponse = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      fullName: 'Otro Ana',
      email: 'ana.gomez@example.com',
      city: 'La Plata',
      country: 'Argentina',
      picture: 'https://example.com/otro.jpg',
      active: true
    })
  });
  assert.equal(duplicateResponse.status, 409);

  const staleVersionResponse = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ active: false, version: 1 })
  });
  assert.equal(staleVersionResponse.status, 409);
});

test('lista con búsqueda, filtros, orden y límites', async () => {
  const searchResponse = await fetch(`${baseUrl}/api/patients?q=gomez`, {
    headers: authHeaders('user')
  });
  assert.equal(searchResponse.status, 200);
  assert.equal((await searchResponse.json()).total, 1);

  const activeResponse = await fetch(`${baseUrl}/api/patients?active=true`, {
    headers: authHeaders('user')
  });
  assert.ok((await activeResponse.json()).total >= 2);

  const sortResponse = await fetch(
    `${baseUrl}/api/patients?sort=email&order=desc&limit=1&page=1`,
    { headers: authHeaders('user') }
  );
  const sortBody = await sortResponse.json();
  assert.equal(sortBody.items.length, 1);
  assert.equal(sortBody.totalPages, sortBody.total);

  const limitResponse = await fetch(`${baseUrl}/api/patients?limit=51`, {
    headers: authHeaders('user')
  });
  assert.equal(limitResponse.status, 413);

  const invalidPageResponse = await fetch(`${baseUrl}/api/patients?page=0`, {
    headers: authHeaders('user')
  });
  assert.equal(invalidPageResponse.status, 400);
});

test('rechaza cuerpos demasiado grandes', async () => {
  const response = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      fullName: 'x'.repeat(9000),
      email: 'big@example.com',
      city: 'La Plata',
      country: 'Argentina',
      picture: 'https://example.com/big.jpg',
      active: true
    })
  });
  assert.equal(response.status, 413);
});

test('health permanece público', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('GET /api/v1/healthsites devuelve centros normalizados', async () => {
  const response = await fetch(`${baseUrl}/api/v1/healthsites`, {
    headers: authHeaders('user')
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), healthsites);
});

test('GET /api/v1/healthsites requiere autenticación', async () => {
  const response = await fetch(`${baseUrl}/api/v1/healthsites`);

  assert.equal(response.status, 401);
});

test('rechaza consultas sin token o con token inválido', async () => {
  const missingResponse = await fetch(`${baseUrl}/api/patients`);
  assert.equal(missingResponse.status, 401);

  const invalidResponse = await fetch(`${baseUrl}/api/patients`, {
    headers: { Authorization: 'Bearer invalid-token' }
  });
  assert.equal(invalidResponse.status, 401);
});

test('un usuario no puede crear ni eliminar pacientes', async () => {
  const createResponse = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders('user')
    },
    body: JSON.stringify({
      fullName: 'Ana Pérez',
      email: 'nueva@example.com',
      city: 'La Plata',
      country: 'Argentina',
      picture: 'https://example.com/ana.jpg',
      active: true
    })
  });
  assert.equal(createResponse.status, 403);

  const current = await fetch(`${baseUrl}/api/patients/patient-1`, {
    headers: authHeaders('user')
  });
  const patient = await current.json();

  const deleteResponse = await fetch(
    `${baseUrl}/api/patients/patient-1?version=${patient.version}`,
    {
      method: 'DELETE',
      headers: authHeaders('user')
    }
  );
  assert.equal(deleteResponse.status, 403);
});
