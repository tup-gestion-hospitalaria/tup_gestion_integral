import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import { auth, db } from '../../src/firebase.js';
import { createApp } from '../../src/app.js';
import { FirestorePatientStore } from '../../src/firestore-patient-store.js';
import { FirestoreReferralStore } from '../../src/firestore-referral-store.js';
import { FirestoreUserStore } from '../../src/firestore-user-store.js';
import { createHealthsitesService } from '../../src/healthsites-service.js';
import {
  buildPatientBusinessFields,
  EMULATOR_PROJECT_ID
} from '../fixtures/emulator-data.js';
import { resetAndSeedEmulators } from '../support/emulators.js';
import { signIn } from '../support/referral-emulator-helpers.js';

const reportUrl = new URL('../../ci-reports/e2e-evidence.json', import.meta.url);
const startedAt = new Date().toISOString();
const scenarios = [
  { name: 'login autorizado con Firebase Auth Emulator', status: 'pending' },
  { name: 'crear, editar y consultar paciente en Firestore', status: 'pending' },
  { name: 'persistir y volver a consultar una derivacion', status: 'pending' },
  { name: 'rechazar solicitudes con respuestas 401 y 403', status: 'pending' },
  { name: 'recuperar Healthsites despues de una caida', status: 'pending' }
];

let server;
let baseUrl;
let adminToken;
let userToken;
let patientId;
let healthsitesCalls = 0;

async function recordScenario(name, action) {
  const scenario = scenarios.find((item) => item.name === name);
  scenario.status = 'running';

  try {
    const evidence = await action();
    scenario.status = 'passed';
    scenario.evidence = evidence;
    return evidence;
  } catch (error) {
    scenario.status = 'failed';
    scenario.error = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

async function api(path, { token, method = 'GET', body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  return fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

async function listen(app) {
  const instance = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    instance.once('listening', resolve);
    instance.once('error', reject);
  });

  const address = instance.address();
  return {
    server: instance,
    url: `http://127.0.0.1:${address.port}`
  };
}

before(async () => {
  await resetAndSeedEmulators();

  const healthsitesService = createHealthsitesService({
    apiKey: 'emulator-test-key',
    sourceUrl: 'https://healthsites.example.test/facilities/',
    pageCount: 1,
    fetchImplementation: async () => {
      healthsitesCalls += 1;
      if (healthsitesCalls === 1) {
        throw new Error('Simulated Healthsites outage');
      }

      return {
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'gi13-healthsite',
              properties: {
                name: 'Hospital de prueba',
                city: 'La Plata',
                address: 'Calle Emulator 100'
              }
            }
          ]
        })
      };
    }
  });

  const app = createApp(new FirestorePatientStore(db), {
    userStore: new FirestoreUserStore(db),
    referralStore: new FirestoreReferralStore(db),
    verifyIdToken: (token) => auth.verifyIdToken(token, true),
    healthsitesService
  });
  const listening = await listen(app);
  server = listening.server;
  baseUrl = listening.url;
});

after(async () => {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  } finally {
    await mkdir(new URL('../../ci-reports/', import.meta.url), {
      recursive: true
    });
    await writeFile(
      reportUrl,
      `${JSON.stringify(
        {
          suite: 'GI-13 critical E2E journey',
          projectId: EMULATOR_PROJECT_ID,
          productionAccess: false,
          startedAt,
          finishedAt: new Date().toISOString(),
          scenarios
        },
        null,
        2
      )}\n`
    );
  }
});

test('login autorizado con Firebase Auth Emulator', async () => {
  await recordScenario('login autorizado con Firebase Auth Emulator', async () => {
    adminToken = await signIn('admin@example.test', 'Admin1234!');
    userToken = await signIn('user@example.test', 'User1234!');

    const [adminResponse, userResponse] = await Promise.all([
      api('/api/v1/users/me', { token: adminToken }),
      api('/api/v1/users/me', { token: userToken })
    ]);
    assert.equal(adminResponse.status, 200);
    assert.equal(userResponse.status, 200);

    const [admin, user] = await Promise.all([
      adminResponse.json(),
      userResponse.json()
    ]);
    assert.equal(admin.role, 'admin');
    assert.equal(admin.status, 'approved');
    assert.equal(user.role, 'user');
    assert.equal(user.status, 'approved');

    return { authorizedRoles: ['admin', 'user'] };
  });
});

test('crear, editar y consultar paciente en Firestore', async () => {
  await recordScenario(
    'crear, editar y consultar paciente en Firestore',
    async () => {
      const patient = buildPatientBusinessFields({
        fullName: 'GI13 Ana',
        lastName: 'Recorrido',
        documentNumber: '30999123',
        email: 'gi13-patient@example.test'
      });
      const createResponse = await api('/api/v1/patients', {
        token: adminToken,
        method: 'POST',
        body: patient
      });
      assert.equal(createResponse.status, 201);
      const created = await createResponse.json();
      patientId = created.id;
      assert.equal(created.fullName, patient.fullName);

      const replaceResponse = await api(`/api/v1/patients/${patientId}`, {
        token: adminToken,
        method: 'PUT',
        body: {
          ...patient,
          lastName: 'Actualizado',
          city: 'Berisso',
          version: created.version
        }
      });
      assert.equal(replaceResponse.status, 200);
      const updated = await replaceResponse.json();
      assert.equal(updated.version, created.version + 1);
      assert.equal(updated.lastName, 'Actualizado');

      const readResponse = await api(`/api/v1/patients/${patientId}`, {
        token: userToken
      });
      assert.equal(readResponse.status, 200);
      const read = await readResponse.json();
      assert.equal(read.lastName, 'Actualizado');
      assert.equal(read.city, 'Berisso');

      const listResponse = await api(
        `/api/v1/patients?q=${encodeURIComponent(patient.fullName)}`,
        { token: userToken }
      );
      assert.equal(listResponse.status, 200);
      const listed = await listResponse.json();
      assert.ok(listed.items.some((item) => item.id === patientId));

      return { created: true, edited: true, readAfterEdit: true, listed: true };
    }
  );
});

test('persistir y volver a consultar una derivacion', async () => {
  await recordScenario(
    'persistir y volver a consultar una derivacion',
    async () => {
      const idempotencyKey = 'gi13-critical-journey-referral';
      const createResponse = await api('/api/v1/referrals', {
        token: userToken,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: {
          patientId,
          destination: {
            healthsiteId: 'gi13-healthsite',
            name: 'Hospital de prueba',
            address: 'Calle Emulator 100'
          },
          reason: 'Consulta especializada',
          notes: 'Recorrido automatizado GI-13',
          priority: 'normal'
        }
      });
      assert.equal(createResponse.status, 201);
      const created = await createResponse.json();
      assert.equal(created.patientId, patientId);
      assert.equal(created.status, 'draft');

      const reloadResponse = await api(
        `/api/v1/referrals/${created.id}`,
        { token: userToken }
      );
      assert.equal(reloadResponse.status, 200);
      const reloaded = await reloadResponse.json();
      assert.equal(reloaded.id, created.id);
      assert.equal(reloaded.destination.healthsiteId, 'gi13-healthsite');
      assert.equal(reloaded.reason, 'Consulta especializada');

      const listResponse = await api(
        `/api/v1/referrals?patientId=${encodeURIComponent(patientId)}`,
        { token: userToken }
      );
      assert.equal(listResponse.status, 200);
      const referrals = await listResponse.json();
      assert.ok(referrals.some((referral) => referral.id === created.id));

      return { created: true, readAfterReload: true, listed: true };
    }
  );
});

test('rechazar solicitudes con respuestas 401 y 403', async () => {
  await recordScenario(
    'rechazar solicitudes con respuestas 401 y 403',
    async () => {
      const unauthorized = await api('/api/v1/patients');
      assert.equal(unauthorized.status, 401);

      const forbidden = await api('/api/v1/patients', {
        token: userToken,
        method: 'POST',
        body: buildPatientBusinessFields({
          documentNumber: '30999124',
          email: 'gi13-denied@example.test'
        })
      });
      assert.equal(forbidden.status, 403);

      return { anonymousRead: 401, unauthorizedWrite: 403 };
    }
  );
});

test('recuperar Healthsites despues de una caida', async () => {
  await recordScenario(
    'recuperar Healthsites despues de una caida',
    async () => {
      const outage = await api('/api/v1/healthsites', { token: userToken });
      assert.equal(outage.status, 502);
      assert.equal((await outage.json()).code, 'HEALTHSITES_UNAVAILABLE');

      const retry = await api('/api/v1/healthsites', { token: userToken });
      assert.equal(retry.status, 200);
      const sites = await retry.json();
      assert.equal(sites.length, 1);
      assert.equal(sites[0].id, 'gi13-healthsite');
      assert.equal(healthsitesCalls, 2);

      return { firstRequest: 502, retryRequest: 200, providerCalls: 2 };
    }
  );
});
