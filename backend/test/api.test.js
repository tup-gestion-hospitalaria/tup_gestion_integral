import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createApp } from '../src/app.js';
import { PatientStore } from '../src/patient-store.js';

const initialPatient = {
  id: 'patient-1',
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  city: 'La Plata',
  country: 'Argentina',
  picture: 'https://example.com/ana.jpg',
  active: true
};

let baseUrl;
let server;

before(async () => {
  const app = createApp(new PatientStore([initialPatient]));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
});

test('GET devuelve todos los pacientes', async () => {
  const response = await fetch(`${baseUrl}/api/patients`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [initialPatient]);
});

test('GET devuelve un paciente por id y 404 si no existe', async () => {
  const response = await fetch(`${baseUrl}/api/patients/patient-1`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), initialPatient);

  const missingResponse = await fetch(`${baseUrl}/api/patients/missing`);
  assert.equal(missingResponse.status, 404);
});

test('POST crea un paciente', async () => {
  const newPatient = {
    fullName: 'Juan López',
    email: 'juan@example.com',
    city: 'Berisso',
    country: 'Argentina',
    picture: 'https://example.com/juan.jpg',
    active: true
  };
  const response = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newPatient)
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.ok(body.id);
  assert.deepEqual({ ...body, id: undefined }, { ...newPatient, id: undefined });
});

test('PUT reemplaza completamente un paciente', async () => {
  const replacement = {
    fullName: 'Ana Gómez',
    email: 'ana.gomez@example.com',
    city: 'Ensenada',
    country: 'Argentina',
    picture: 'https://example.com/ana-gomez.jpg',
    active: false
  };
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(replacement)
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 'patient-1', ...replacement });
});

test('PATCH modifica solamente las propiedades enviadas', async () => {
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: true })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.active, true);
  assert.equal(body.fullName, 'Ana Gómez');
});

test('DELETE elimina un paciente', async () => {
  const createResponse = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const response = await fetch(`${baseUrl}/api/patients/${created.id}`, {
    method: 'DELETE'
  });
  assert.equal(response.status, 204);

  const missingResponse = await fetch(
    `${baseUrl}/api/patients/${created.id}`
  );
  assert.equal(missingResponse.status, 404);
});

test('rechaza cuerpos incompletos o propiedades desconocidas', async () => {
  const incompleteResponse = await fetch(`${baseUrl}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Incompleto' })
  });
  assert.equal(incompleteResponse.status, 400);

  const unknownResponse = await fetch(
    `${baseUrl}/api/patients/patient-1`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' })
    }
  );
  assert.equal(unknownResponse.status, 400);
});
