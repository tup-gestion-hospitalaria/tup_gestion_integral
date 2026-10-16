import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createApp } from '../src/app.js';
import { PatientStore } from '../src/patient-store.js';
import { UserStore } from '../src/user-store.js';

let baseUrl;
let server;
let assignedClaims = {};
let revokedTokens = [];

const decodedTokens = {
  'admin-token': {
    uid: 'admin-1',
    email: 'admin@hospital.com',
    name: 'Admin Hospital',
    role: 'admin'
  },
  'approved-user-token': {
    uid: 'user-approved-1',
    email: 'doctor@hospital.com',
    name: 'Dr. López',
    role: 'user'
  },
  'new-user-token': {
    uid: 'user-new-1',
    email: 'nuevo@hospital.com',
    name: 'Enfermero Nuevo',
    role: null
  },
  'pending-user-token': {
    uid: 'user-pending-1',
    email: 'pendiente@hospital.com',
    name: 'Usuario Pendiente',
    role: null
  },
  'disabled-user-token': {
    uid: 'user-disabled-1',
    email: 'deshabilitado@hospital.com',
    name: 'Usuario Deshabilitado',
    role: 'user'
  }
};

async function verifyIdToken(token) {
  const decoded = decodedTokens[token];
  if (!decoded) {
    throw new Error('Token inválido');
  }
  return decoded;
}

function authHeader(tokenKey) {
  return { Authorization: `Bearer ${tokenKey}` };
}

before(async () => {
  const initialUsers = [
    {
      uid: 'admin-1',
      email: 'admin@hospital.com',
      displayName: 'Admin Hospital',
      role: 'admin',
      status: 'approved',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      uid: 'user-approved-1',
      email: 'doctor@hospital.com',
      displayName: 'Dr. López',
      role: 'user',
      status: 'approved',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      uid: 'user-disabled-1',
      email: 'deshabilitado@hospital.com',
      displayName: 'Usuario Deshabilitado',
      role: 'user',
      status: 'disabled',
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const userStore = new UserStore(initialUsers);
  const patientStore = new PatientStore([
    {
      id: 'patient-test',
      fullName: 'Paciente Uno',
      email: 'p1@test.com',
      city: 'La Plata',
      country: 'Argentina',
      picture: 'https://example.com/p1.jpg',
      active: true
    }
  ]);

  const app = createApp(patientStore, {
    userStore,
    verifyIdToken,
    setCustomUserClaims: async (uid, claims) => {
      assignedClaims[uid] = claims;
    },
    revokeRefreshTokens: async (uid) => {
      revokedTokens.push(uid);
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

test('1. Un usuario recién registrado que consulta /me se crea con status pending y active false', async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/me`, {
    headers: authHeader('new-user-token')
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.uid, 'user-new-1');
  assert.equal(body.email, 'nuevo@hospital.com');
  assert.equal(body.status, 'pending');
  assert.equal(body.active, false);
});

test('2. Un usuario con cuenta pending recibe 403 al acceder a recursos protegidos', async () => {
  const response = await fetch(`${baseUrl}/api/v1/patients`, {
    headers: authHeader('new-user-token')
  });

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.code, 'ACCOUNT_PENDING');
  assert.match(body.message, /pendiente de aprobación/i);
});

test('un usuario pending puede actualizar los datos de su propio perfil', async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader('pending-user-token')
    },
    body: JSON.stringify({ displayName: 'Nombre actualizado' })
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.displayName, 'Nombre actualizado');
  assert.equal(body.status, 'pending');
  assert.equal(body.active, false);
});

test('3. Un usuario deshabilitado recibe 403 al acceder al sistema', async () => {
  const response = await fetch(`${baseUrl}/api/v1/patients`, {
    headers: authHeader('disabled-user-token')
  });

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.code, 'ACCOUNT_DISABLED');
  assert.match(body.message, /deshabilitada/i);
});

test('4. Un usuario aprobado con rol user puede consultar pacientes', async () => {
  const response = await fetch(`${baseUrl}/api/v1/patients`, {
    headers: authHeader('approved-user-token')
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body));
  assert.equal(body.length, 1);
});

test('5. Un usuario común no puede listar ni modificar usuarios (403)', async () => {
  const listResponse = await fetch(`${baseUrl}/api/v1/users`, {
    headers: authHeader('approved-user-token')
  });
  assert.equal(listResponse.status, 403);

  const patchResponse = await fetch(`${baseUrl}/api/v1/users/user-new-1/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader('approved-user-token') },
    body: JSON.stringify({ status: 'approved' })
  });
  assert.equal(patchResponse.status, 403);
});

test('6. Un administrador puede listar todos los usuarios', async () => {
  const response = await fetch(`${baseUrl}/api/v1/users`, {
    headers: authHeader('admin-token')
  });

  assert.equal(response.status, 200);
  const users = await response.json();
  assert.ok(Array.isArray(users));
  assert.ok(users.some((u) => u.uid === 'user-new-1'));
});

test('7. Un administrador aprueba un usuario pendiente y le asigna rol', async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/user-new-1/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader('admin-token') },
    body: JSON.stringify({ status: 'approved', role: 'user' })
  });

  assert.equal(response.status, 200);
  const updatedUser = await response.json();
  assert.equal(updatedUser.status, 'approved');
  assert.equal(updatedUser.active, true);
  assert.equal(updatedUser.role, 'user');

  // Verifica que se invocó setCustomUserClaims
  assert.deepEqual(assignedClaims['user-new-1'], { role: 'user' });
});

test('8. Un administrador puede deshabilitar un usuario y revocar sus tokens', async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/user-approved-1/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader('admin-token') },
    body: JSON.stringify({ status: 'disabled' })
  });

  assert.equal(response.status, 200);
  const updatedUser = await response.json();
  assert.equal(updatedUser.status, 'disabled');
  assert.equal(updatedUser.active, false);

  // Verifica que se revocaron tokens en Firebase Admin
  assert.ok(revokedTokens.includes('user-approved-1'));
});

test('un rol eliminado no se recupera desde un token anterior', async () => {
  const removeRoleResponse = await fetch(
    `${baseUrl}/api/v1/users/admin-1/role`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader('admin-token')
      },
      body: JSON.stringify({ role: null })
    }
  );

  assert.equal(removeRoleResponse.status, 200);
  assert.equal((await removeRoleResponse.json()).role, null);
  assert.deepEqual(assignedClaims['admin-1'], { role: null });
  assert.ok(revokedTokens.includes('admin-1'));

  const oldTokenResponse = await fetch(`${baseUrl}/api/v1/users`, {
    headers: authHeader('admin-token')
  });

  assert.equal(oldTokenResponse.status, 403);
  assert.equal((await oldTokenResponse.json()).code, 'NO_ROLE');
});
