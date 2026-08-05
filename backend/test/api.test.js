import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";
import { PatientStore } from "../src/patient-store.js";

const initialPatient = {
  id: "patient-1",
  fullName: "Ana Pérez",
  email: "ana@example.com",
  city: "La Plata",
  country: "Argentina",
  picture: "https://example.com/ana.jpg",
  active: true,
};

let baseUrl;
let server;

const decodedTokens = {
  "user-token": {
    uid: "user-1",
    email: "user@example.com",
    name: "Usuario de prueba",
    role: "user",
  },
  "admin-token": {
    uid: "admin-1",
    email: "admin@example.com",
    name: "Administrador de prueba",
    role: "admin",
  },
  "no-role-token": {
    uid: "user-2",
    email: "new-user@example.com",
  },
};

async function verifyIdToken(token) {
  const decodedToken = decodedTokens[token];

  if (!decodedToken) {
    throw new Error("Token inválido");
  }

  return decodedToken;
}

function authHeaders(role = "admin") {
  return { Authorization: `Bearer ${role}-token` };
}

before(async () => {
  const app = createApp(new PatientStore([initialPatient]), { verifyIdToken });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
});

test("GET devuelve todos los pacientes", async () => {
  const response = await fetch(`${baseUrl}/api/patients`, {
    headers: authHeaders("user"),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [initialPatient]);
});

test("GET devuelve un paciente por id y 404 si no existe", async () => {
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    headers: authHeaders("user"),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), initialPatient);

  const missingResponse = await fetch(`${baseUrl}/api/patients/missing`, {
    headers: authHeaders("user"),
  });
  assert.equal(missingResponse.status, 404);
});

test("POST crea un paciente", async () => {
  const newPatient = {
    fullName: "Juan López",
    email: "juan@example.com",
    city: "Berisso",
    country: "Argentina",
    picture: "https://example.com/juan.jpg",
    active: true,
  };
  const response = await fetch(`${baseUrl}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(newPatient),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.ok(body.id);
  assert.deepEqual(
    { ...body, id: undefined },
    { ...newPatient, id: undefined },
  );
});

test("PUT reemplaza completamente un paciente", async () => {
  const replacement = {
    fullName: "Ana Gómez",
    email: "ana.gomez@example.com",
    city: "Ensenada",
    country: "Argentina",
    picture: "https://example.com/ana-gomez.jpg",
    active: false,
  };
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(replacement),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "patient-1", ...replacement });
});

test("PATCH modifica solamente las propiedades enviadas", async () => {
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ active: true }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.active, true);
  assert.equal(body.fullName, "Ana Gómez");
});

test("PATCH permite guardar un centro de derivación", async () => {
  const healthsite = {
    id: "hospital-1",
    name: "Hospital de prueba",
    city: "La Plata",
    address: "Calle 1",
    type: "hospital",
    latitude: -34.9,
    longitude: -57.9,
    googleMapsUrl: null,
  };
  const response = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ healthsite }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).healthsite, healthsite);
});

test("DELETE elimina un paciente", async () => {
  const createResponse = await fetch(`${baseUrl}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      fullName: "Paciente Temporal",
      email: "temporal@example.com",
      city: "La Plata",
      country: "Argentina",
      picture: "https://example.com/temporal.jpg",
      active: true,
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/api/patients/${created.id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  assert.equal(response.status, 204);

  const missingResponse = await fetch(`${baseUrl}/api/patients/${created.id}`, {
    headers: authHeaders("user"),
  });
  assert.equal(missingResponse.status, 404);
});

test("rechaza cuerpos incompletos o propiedades desconocidas", async () => {
  const incompleteResponse = await fetch(`${baseUrl}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ fullName: "Incompleto" }),
  });
  assert.equal(incompleteResponse.status, 400);

  const unknownResponse = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(unknownResponse.status, 400);
});

test("health permanece público", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("rechaza consultas sin token o con token inválido", async () => {
  const missingResponse = await fetch(`${baseUrl}/api/patients`);
  assert.equal(missingResponse.status, 401);

  const invalidResponse = await fetch(`${baseUrl}/api/patients`, {
    headers: { Authorization: "Bearer invalid-token" },
  });
  assert.equal(invalidResponse.status, 401);
});

test("GET /api/me devuelve identidad y rol del token", async () => {
  const response = await fetch(`${baseUrl}/api/me`, {
    headers: authHeaders("user"),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), decodedTokens["user-token"]);
});

test("usuarios sin claim reciben el rol user por defecto", async () => {
  const response = await fetch(`${baseUrl}/api/me`, {
    headers: { Authorization: "Bearer no-role-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    uid: "user-2",
    email: "new-user@example.com",
    name: null,
    role: "user",
  });
});

test("un usuario no puede crear ni eliminar pacientes", async () => {
  const createResponse = await fetch(`${baseUrl}/api/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders("user"),
    },
    body: JSON.stringify(initialPatient),
  });
  assert.equal(createResponse.status, 403);

  const deleteResponse = await fetch(`${baseUrl}/api/patients/patient-1`, {
    method: "DELETE",
    headers: authHeaders("user"),
  });
  assert.equal(deleteResponse.status, 403);
});
