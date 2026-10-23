import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import {
  assertFails,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../../src/firebase.js';
import { FirestorePatientStore } from '../../src/firestore-patient-store.js';
import { startServer } from '../../src/start-server.js';
import {
  EMULATOR_PROJECT_ID,
  emulatorPatients,
  emulatorUsers
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

function headersFor(role) {
  return { Authorization: `Bearer ${tokens.get(role)}` };
}

before(async () => {
  await resetAndSeedEmulators();

  for (const user of emulatorUsers) {
    tokens.set(user.role, await signIn(user.email, user.password));
  }

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

test('el store usa Firestore Emulator con fixtures deterministas', async () => {
  const store = new FirestorePatientStore(db);
  const patients = await store.listAll();

  assert.deepEqual(
    patients.sort((left, right) => left.id.localeCompare(right.id)),
    emulatorPatients
  );

  const tempId = 'patient-temp';
  const payload = {
    fullName: 'Paciente temporal',
    email: 'temporal@example.test',
    city: 'Ensenada',
    country: 'Argentina',
    picture: 'https://example.test/temporal.jpg',
    active: true
  };

  await store.insert(tempId, { id: tempId, ...payload });
  assert.deepEqual(await store.findById(tempId), { id: tempId, ...payload });
  await db.collection('patients').doc(tempId).delete();
});

test('el backend arranca y valida tokens y roles con Auth Emulator', async () => {
  const profileResponse = await fetch(`${baseUrl}/api/v1/users/me`, {
    headers: headersFor('user')
  });
  assert.equal(profileResponse.status, 200);

  const profile = await profileResponse.json();
  assert.equal(profile.status, 'approved');
  assert.equal(profile.active, true);
  assert.match(profile.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(profile.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  const readResponse = await fetch(`${baseUrl}/api/patients`, {
    headers: headersFor('user')
  });
  assert.equal(readResponse.status, 200);
  const patientsPage = await readResponse.json();
  assert.equal(patientsPage.total, emulatorPatients.length);
  assert.equal(patientsPage.items.length, emulatorPatients.length);

  const deniedResponse = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headersFor('user')
    },
    body: JSON.stringify(emulatorPatients[0])
  });
  assert.equal(deniedResponse.status, 403);

  const { id: _id, ...newPatient } = emulatorPatients[1];
  const createResponse = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headersFor('admin')
    },
    body: JSON.stringify({ ...newPatient, email: 'nuevo@example.test' })
  });
  assert.equal(createResponse.status, 201);

  const created = await createResponse.json();
  assert.equal((await db.collection('patients').doc(created.id).get()).exists, true);
});

test('las reglas bloquean el acceso directo de clientes a Firestore', async () => {
  const unauthenticatedDb = rulesEnvironment
    .unauthenticatedContext()
    .firestore();
  const authenticatedDb = rulesEnvironment
    .authenticatedContext('admin-1', { role: 'admin' })
    .firestore();

  await assertFails(getDoc(doc(unauthenticatedDb, 'patients/patient-1')));
  await assertFails(getDoc(doc(authenticatedDb, 'patients/patient-1')));
  await assertFails(
    setDoc(doc(authenticatedDb, 'patients/direct-write'), {
      fullName: 'Acceso directo no permitido'
    })
  );
});
