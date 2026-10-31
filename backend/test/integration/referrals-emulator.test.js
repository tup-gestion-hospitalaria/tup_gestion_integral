import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import {
  assertFails,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../../src/firebase.js';
import { startServer } from '../../src/start-server.js';
import {
  EMULATOR_PROJECT_ID,
  emulatorPatients
} from '../fixtures/emulator-data.js';
import { resetAndSeedEmulators } from '../support/emulators.js';

let baseUrl;
let server;
let rulesEnvironment;
const tokens = new Map();

async function signIn(email, password) {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const response = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Auth Emulator rechazó ${email} (${response.status}): ${await response.text()}`
    );
  }

  return (await response.json()).idToken;
}

function headersFor(role, extra = {}) {
  return { Authorization: `Bearer ${tokens.get(role)}`, ...extra };
}

function referralBody(patientId = 'patient-1') {
  return {
    patientId,
    destination: {
      healthsiteId: 'emulator-hs-1',
      name: 'Hospital Emulator',
      address: 'Calle Emulator 100'
    },
    reason: 'Consulta especializada',
    notes: null
  };
}

before(async () => {
  await resetAndSeedEmulators();

  tokens.set('user', await signIn('user@example.test', 'User1234!'));
  tokens.set('admin', await signIn('admin@example.test', 'Admin1234!'));

  const started = await startServer({ host: '127.0.0.1', port: 0 });
  server = started.server;
  baseUrl = `http://127.0.0.1:${started.port}`;

  const rules = await readFile(
    new URL('../../../firestore.rules', import.meta.url),
    'utf8'
  );
  rulesEnvironment = await initializeTestEnvironment({
    projectId: EMULATOR_PROJECT_ID,
    firestore: { rules }
  });
});

after(async () => {
  await rulesEnvironment?.cleanup();

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('persiste derivación y evento en Firestore Emulator', async () => {
  const createResponse = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headersFor('user')
    },
    body: JSON.stringify(referralBody())
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();

  const referralDoc = await db.collection('referrals').doc(created.id).get();
  assert.equal(referralDoc.exists, true);
  assert.equal(referralDoc.data().status, 'draft');

  const events = await db
    .collection('referrals')
    .doc(created.id)
    .collection('events')
    .get();
  assert.equal(events.size, 1);
});

test('agrega evento al enviar sin modificar el primero', async () => {
  const bodyPayload = referralBody(emulatorPatients[0].id);
  bodyPayload.destination.healthsiteId = 'emulator-hs-history';

  const createdResponse = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headersFor('user')
    },
    body: JSON.stringify(bodyPayload)
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();

  const eventsBefore = await db
    .collection('referrals')
    .doc(created.id)
    .collection('events')
    .get();
  const firstEvent = eventsBefore.docs[0].data();

  await fetch(`${baseUrl}/api/v1/referrals/${created.id}/transitions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headersFor('user')
    },
    body: JSON.stringify({ to: 'submitted' })
  });

  const eventsAfter = await db
    .collection('referrals')
    .doc(created.id)
    .collection('events')
    .get();
  assert.equal(eventsAfter.size, 2);
  assert.deepEqual(eventsAfter.docs[0].data(), firstEvent);
  assert.equal(eventsAfter.docs[1].data().action, 'referral.submitted');
});

test('las reglas bloquean acceso directo a referrals', async () => {
  const authenticatedDb = rulesEnvironment
    .authenticatedContext('user-1', { role: 'user' })
    .firestore();

  await assertFails(getDoc(doc(authenticatedDb, 'referrals/referral-direct')));
  await assertFails(
    setDoc(doc(authenticatedDb, 'referrals/referral-direct'), {
      patientId: 'patient-1'
    })
  );
});
