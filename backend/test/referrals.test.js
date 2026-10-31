import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createApp } from '../src/app.js';
import { PatientStore } from '../src/patient-store.js';
import { ReferralStore } from '../src/referral-store.js';
import { UserStore } from '../src/user-store.js';

const auditFields = {
  version: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'system',
  updatedBy: 'system',
  deletedAt: null,
  deletedBy: null
};

const activePatient = {
  id: 'patient-1',
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  city: 'La Plata',
  country: 'Argentina',
  picture: 'https://example.com/ana.jpg',
  active: true,
  ...auditFields
};

const inactivePatient = {
  id: 'patient-inactive',
  fullName: 'Inactivo',
  email: 'inactive@example.com',
  city: 'La Plata',
  country: 'Argentina',
  picture: 'https://example.com/inactive.jpg',
  active: false,
  ...auditFields
};

let baseUrl;
let server;
let referralStore;

const decodedTokens = {
  'user-token': {
    uid: 'user-1',
    email: 'user@example.com',
    name: 'Usuario de prueba',
    role: 'user'
  },
  'other-user-token': {
    uid: 'user-2',
    email: 'other@example.com',
    name: 'Otro usuario',
    role: 'user'
  },
  'admin-token': {
    uid: 'admin-1',
    email: 'admin@example.com',
    name: 'Administrador de prueba',
    role: 'admin'
  },
  'pending-token': {
    uid: 'user-pending',
    email: 'pending@example.com',
    name: 'Pendiente',
    role: null
  }
};

async function verifyIdToken(token) {
  const decodedToken = decodedTokens[token];
  if (!decodedToken) {
    throw new Error('Token inválido');
  }
  return decodedToken;
}

function authHeaders(role = 'user') {
  return { Authorization: `Bearer ${role}-token` };
}

function referralPayload(overrides = {}) {
  return {
    patientId: 'patient-1',
    destination: {
      healthsiteId: 'hs-1',
      name: 'Hospital Central',
      address: 'Calle 1 100'
    },
    reason: 'Evaluación especializada',
    notes: null,
    ...overrides
  };
}

before(async () => {
  referralStore = new ReferralStore();
  const userStore = new UserStore([
    {
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Usuario de prueba',
      role: 'user',
      status: 'approved',
      active: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      uid: 'user-2',
      email: 'other@example.com',
      displayName: 'Otro usuario',
      role: 'user',
      status: 'approved',
      active: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      uid: 'admin-1',
      email: 'admin@example.com',
      displayName: 'Administrador de prueba',
      role: 'admin',
      status: 'approved',
      active: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  ]);

  const app = createApp(new PatientStore([activePatient, inactivePatient]), {
    verifyIdToken,
    userStore,
    referralStore
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

test('POST crea borrador con snapshot, prioridad y evento inicial', async () => {
  const response = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(referralPayload())
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.status, 'draft');
  assert.equal(body.priority, 'normal');
  assert.equal(body.responsibleId, 'user-1');
  assert.equal(body.destination.name, 'Hospital Central');

  const events = await referralStore.listEvents(body.id);
  assert.equal(events.length, 1);
  assert.equal(events[0].action, 'referral.created');
});

test('GET por id incluye historial y listado por paciente', async () => {
  const createResponse = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(
      referralPayload({
        destination: {
          healthsiteId: 'hs-list',
          name: 'Centro Listado',
          address: 'Av. 2 200'
        }
      })
    )
  });
  const created = await createResponse.json();

  const byId = await fetch(`${baseUrl}/api/v1/referrals/${created.id}`, {
    headers: authHeaders('user')
  });
  assert.equal(byId.status, 200);
  const detail = await byId.json();
  assert.ok(Array.isArray(detail.history));
  assert.equal(detail.history.length, 1);

  const list = await fetch(`${baseUrl}/api/v1/referrals?patientId=patient-1`, {
    headers: authHeaders('user')
  });
  const items = await list.json();
  assert.ok(items.some((item) => item.id === created.id));
  assert.equal(items[0].history, undefined);
});

test('usuario ajeno recibe 403 al consultar derivación ajena', async () => {
  const createResponse = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(
      referralPayload({
        destination: {
          healthsiteId: 'hs-forbidden',
          name: 'Centro Privado',
          address: 'Secreto 1'
        }
      })
    )
  });
  const created = await createResponse.json();

  const forbidden = await fetch(`${baseUrl}/api/v1/referrals/${created.id}`, {
    headers: authHeaders('other-user')
  });
  assert.equal(forbidden.status, 403);

  const adminView = await fetch(`${baseUrl}/api/v1/referrals/${created.id}`, {
    headers: authHeaders('admin')
  });
  assert.equal(adminView.status, 200);
});

test('valida paciente inexistente e inactivo', async () => {
  const missing = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(referralPayload({ patientId: 'missing' }))
  });
  assert.equal(missing.status, 404);

  const inactive = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(referralPayload({ patientId: 'patient-inactive' }))
  });
  assert.equal(inactive.status, 409);
});

test('rechaza duplicados abiertos e idempotencia', async () => {
  const payload = referralPayload({
    destination: {
      healthsiteId: 'hs-dup',
      name: 'Centro Duplicado',
      address: 'Dup 1'
    }
  });

  const first = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'create-once',
      ...authHeaders('user')
    },
    body: JSON.stringify(payload)
  });
  assert.equal(first.status, 201);
  const created = await first.json();

  const replay = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'create-once',
      ...authHeaders('user')
    },
    body: JSON.stringify(payload)
  });
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).id, created.id);

  const duplicate = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(payload)
  });
  assert.equal(duplicate.status, 409);
});

test('transiciones inválidas y permisos de rol', async () => {
  const createResponse = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(
      referralPayload({
        destination: {
          healthsiteId: 'hs-transition',
          name: 'Centro Transición',
          address: 'Trans 1'
        }
      })
    )
  });
  const created = await createResponse.json();

  const submitResponse = await fetch(
    `${baseUrl}/api/v1/referrals/${created.id}/transitions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
      body: JSON.stringify({ to: 'submitted' })
    }
  );
  assert.equal(submitResponse.status, 200);

  const userAccept = await fetch(
    `${baseUrl}/api/v1/referrals/${created.id}/transitions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
      body: JSON.stringify({ to: 'accepted' })
    }
  );
  assert.equal(userAccept.status, 403);

  const invalid = await fetch(
    `${baseUrl}/api/v1/referrals/${created.id}/transitions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders('admin') },
      body: JSON.stringify({ to: 'completed' })
    }
  );
  assert.equal(invalid.status, 409);

  const rejectMissingReason = await fetch(
    `${baseUrl}/api/v1/referrals/${created.id}/transitions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders('admin') },
      body: JSON.stringify({ to: 'rejected' })
    }
  );
  assert.equal(rejectMissingReason.status, 400);
});

test('el historial conserva eventos previos tras una transición', async () => {
  const createResponse = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(
      referralPayload({
        destination: {
          healthsiteId: 'hs-history',
          name: 'Centro Historial',
          address: 'Hist 1'
        }
      })
    )
  });
  const created = await createResponse.json();
  const firstEvents = await referralStore.listEvents(created.id);
  const firstSnapshot = structuredClone(firstEvents[0]);

  await fetch(`${baseUrl}/api/v1/referrals/${created.id}/transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify({ to: 'submitted' })
  });

  const events = await referralStore.listEvents(created.id);
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], firstSnapshot);
  assert.equal(events[1].action, 'referral.submitted');
});

test('DELETE solo borrador y bloquea enviados', async () => {
  const draftResponse = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(
      referralPayload({
        destination: {
          healthsiteId: 'hs-delete-draft',
          name: 'Centro Borrador',
          address: 'Del 1'
        }
      })
    )
  });
  const draft = await draftResponse.json();

  const deleteDraft = await fetch(`${baseUrl}/api/v1/referrals/${draft.id}`, {
    method: 'DELETE',
    headers: authHeaders('user')
  });
  assert.equal(deleteDraft.status, 204);
  assert.equal(await referralStore.findById(draft.id), null);

  const submittedCreate = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify(
      referralPayload({
        destination: {
          healthsiteId: 'hs-delete-submitted',
          name: 'Centro Enviado',
          address: 'Del 2'
        }
      })
    )
  });
  const submittedReferral = await submittedCreate.json();
  await fetch(`${baseUrl}/api/v1/referrals/${submittedReferral.id}/transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('user') },
    body: JSON.stringify({ to: 'submitted' })
  });

  const deleteSubmitted = await fetch(
    `${baseUrl}/api/v1/referrals/${submittedReferral.id}`,
    {
      method: 'DELETE',
      headers: authHeaders('user')
    }
  );
  assert.equal(deleteSubmitted.status, 409);
});

test('cuenta pendiente no puede crear derivaciones', async () => {
  const app = createApp(new PatientStore([activePatient]), {
    verifyIdToken,
    userStore: new UserStore([
      {
        uid: 'user-pending',
        email: 'pending@example.com',
        displayName: 'Pendiente',
        role: null,
        status: 'pending',
        active: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ]),
    referralStore: new ReferralStore()
  });
  const pendingServer = app.listen(0);
  await new Promise((resolve) => pendingServer.once('listening', resolve));
  const pendingBaseUrl = `http://127.0.0.1:${pendingServer.address().port}`;

  const response = await fetch(`${pendingBaseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders('pending') },
    body: JSON.stringify(referralPayload())
  });
  assert.equal(response.status, 403);
  pendingServer.close();
});
