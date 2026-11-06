import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import {
  assertFails,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth } from '../../src/firebase.js';
import { startServer } from '../../src/start-server.js';
import {
  EMULATOR_PROJECT_ID,
  emulatorPatients
} from '../fixtures/emulator-data.js';
import { resetAndSeedEmulators } from '../support/emulators.js';
import {
  fetchReferralDoc,
  referralBody,
  signIn
} from '../support/referral-emulator-helpers.js';

let baseUrl;
let server;
let rulesEnvironment;
let pendingUid;
const tokens = {};

async function request(path, { token, method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

before(async () => {
  await resetAndSeedEmulators();

  tokens.user = await signIn('user@example.test', 'User1234!');
  tokens.admin = await signIn('admin@example.test', 'Admin1234!');

  const pendingUser = await auth.createUser({
    uid: 'pending-emulator-user',
    email: 'pending@example.test',
    password: 'Pending1234!',
    displayName: 'Usuario pendiente'
  });
  pendingUid = pendingUser.uid;

  const peer = await auth.createUser({
    uid: 'peer-emulator-user',
    email: 'peer@example.test',
    password: 'Peer1234!',
    displayName: 'Usuario par'
  });
  await auth.setCustomUserClaims(peer.uid, { role: 'user' });

  tokens.pending = await signIn('pending@example.test', 'Pending1234!');
  tokens.peer = await signIn('peer@example.test', 'Peer1234!');

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

test('una cuenta pending solo puede consultar su perfil hasta ser aprobada', async () => {
  const profileResponse = await request('/api/v1/users/me', {
    token: tokens.pending
  });
  assert.equal(profileResponse.status, 200);
  const profile = await profileResponse.json();
  assert.equal(profile.uid, pendingUid);
  assert.equal(profile.status, 'pending');
  assert.equal(profile.active, false);
  assert.equal(profile.role, null);

  for (const path of ['/api/v1/patients', '/api/v1/referrals']) {
    const response = await request(path, { token: tokens.pending });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'ACCOUNT_PENDING');
  }

  const approvalResponse = await request(
    `/api/v1/users/${pendingUid}/status`,
    {
      token: tokens.admin,
      method: 'PATCH',
      body: { status: 'approved', role: 'user' }
    }
  );
  assert.equal(approvalResponse.status, 200);
  const approved = await approvalResponse.json();
  assert.equal(approved.status, 'approved');
  assert.equal(approved.active, true);
  assert.equal(approved.role, 'user');

  tokens.approvedPending = await signIn(
    'pending@example.test',
    'Pending1234!'
  );
  const accessResponse = await request('/api/v1/patients', {
    token: tokens.approvedPending
  });
  assert.equal(accessResponse.status, 200);
});

test('los usuarios no pueden administrar roles ni modificar pacientes', async () => {
  for (const path of ['/api/v1/users', `/api/v1/users/${pendingUid}`]) {
    const response = await request(path, { token: tokens.user });
    assert.equal(response.status, 403);
  }

  const roleResponse = await request(
    `/api/v1/users/${pendingUid}/role`,
    {
      token: tokens.user,
      method: 'PATCH',
      body: { role: 'admin' }
    }
  );
  assert.equal(roleResponse.status, 403);

  const { id: _patientId, ...patient } = emulatorPatients[0];
  const operations = [
    request('/api/v1/patients', {
      token: tokens.user,
      method: 'POST',
      body: patient
    }),
    request('/api/v1/patients/patient-1', {
      token: tokens.user,
      method: 'PATCH',
      body: { active: false, version: 1 }
    }),
    request('/api/v1/patients/patient-1', {
      token: tokens.user,
      method: 'DELETE'
    })
  ];

  for (const response of await Promise.all(operations)) {
    assert.equal(response.status, 403);
  }

  const adminUsersResponse = await request('/api/v1/users', {
    token: tokens.admin
  });
  assert.equal(adminUsersResponse.status, 200);
});

test('un usuario no puede leer ni modificar derivaciones de otro usuario', async () => {
  await request('/api/v1/users/me', { token: tokens.user });
  await request('/api/v1/users/me', { token: tokens.peer });

  const createdResponse = await request('/api/v1/referrals', {
    token: tokens.user,
    method: 'POST',
    body: referralBody(emulatorPatients[0].id, {
      destination: {
        healthsiteId: 'permission-isolation-site',
        name: 'Centro de prueba',
        address: 'Dirección de prueba'
      }
    })
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();

  const peerListResponse = await request('/api/v1/referrals', {
    token: tokens.peer
  });
  assert.equal(peerListResponse.status, 200);
  const peerList = await peerListResponse.json();
  assert.equal(peerList.some((referral) => referral.id === created.id), false);

  const foreignRead = await request(`/api/v1/referrals/${created.id}`, {
    token: tokens.peer
  });
  assert.equal(foreignRead.status, 403);

  const foreignPatch = await request(`/api/v1/referrals/${created.id}`, {
    token: tokens.peer,
    method: 'PATCH',
    body: { notes: 'cambio no autorizado' }
  });
  assert.equal(foreignPatch.status, 403);

  const foreignTransition = await request(
    `/api/v1/referrals/${created.id}/transitions`,
    {
      token: tokens.peer,
      method: 'POST',
      body: { to: 'submitted' }
    }
  );
  assert.equal(foreignTransition.status, 403);

  const foreignDelete = await request(`/api/v1/referrals/${created.id}`, {
    token: tokens.peer,
    method: 'DELETE'
  });
  assert.equal(foreignDelete.status, 403);
  assert.equal((await fetchReferralDoc(created.id)).status, 'draft');

  const ownerSubmit = await request(
    `/api/v1/referrals/${created.id}/transitions`,
    {
      token: tokens.user,
      method: 'POST',
      body: { to: 'submitted' }
    }
  );
  assert.equal(ownerSubmit.status, 200);

  const ownerAccept = await request(
    `/api/v1/referrals/${created.id}/transitions`,
    {
      token: tokens.user,
      method: 'POST',
      body: { to: 'accepted' }
    }
  );
  assert.equal(ownerAccept.status, 403);

  const adminRead = await request(`/api/v1/referrals/${created.id}`, {
    token: tokens.admin
  });
  assert.equal(adminRead.status, 200);
});

test('deshabilitar una cuenta revoca su token y bloquea tokens nuevos', async () => {
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const disableResponse = await request(
    `/api/v1/users/${pendingUid}/status`,
    {
      token: tokens.admin,
      method: 'PATCH',
      body: { status: 'disabled' }
    }
  );
  assert.equal(disableResponse.status, 200);
  const disabled = await disableResponse.json();
  assert.equal(disabled.status, 'disabled');
  assert.equal(disabled.active, false);

  const revokedResponse = await request('/api/v1/patients', {
    token: tokens.approvedPending
  });
  assert.equal(revokedResponse.status, 401);

  tokens.disabled = await signIn('pending@example.test', 'Pending1234!');
  const blockedResponse = await request('/api/v1/patients', {
    token: tokens.disabled
  });
  assert.equal(blockedResponse.status, 403);
  assert.equal((await blockedResponse.json()).code, 'ACCOUNT_DISABLED');
});

test('las reglas Firestore rechazan lecturas y escrituras directas para todo rol', async () => {
  const clientDbs = [
    rulesEnvironment.unauthenticatedContext().firestore(),
    rulesEnvironment
      .authenticatedContext('user-1', { role: 'user' })
      .firestore(),
    rulesEnvironment
      .authenticatedContext('admin-1', { role: 'admin' })
      .firestore()
  ];

  for (const clientDb of clientDbs) {
    await assertFails(getDoc(doc(clientDb, 'patients/patient-1')));
    await assertFails(getDoc(doc(clientDb, 'users/user-1')));
    await assertFails(getDoc(doc(clientDb, 'referrals/referral-direct')));
    await assertFails(
      setDoc(doc(clientDb, 'users/role-escalation'), {
        role: 'admin',
        status: 'approved',
        active: true
      })
    );
    await assertFails(
      setDoc(doc(clientDb, 'patients/direct-write'), {
        fullName: 'Escritura no autorizada'
      })
    );
  }
});
