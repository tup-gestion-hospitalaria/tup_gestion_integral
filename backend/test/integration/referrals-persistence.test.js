import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { openLockKey } from '../../src/referral-schema.js';
import { db } from '../../src/firebase.js';
import { startServer } from '../../src/start-server.js';
import { emulatorPatients } from '../fixtures/emulator-data.js';
import { resetAndSeedEmulators } from '../support/emulators.js';
import {
  createReferral,
  fetchReferralDoc,
  headersFor,
  idempotencyDoc,
  listFirestoreEvents,
  lockDocExists,
  patchReferral,
  referralBody,
  signIn,
  transitionReferral
} from '../support/referral-emulator-helpers.js';

let baseUrl;
let server;
const tokens = new Map();

before(async () => {
  await resetAndSeedEmulators();

  tokens.set('user', await signIn('user@example.test', 'User1234!'));
  tokens.set('admin', await signIn('admin@example.test', 'Admin1234!'));

  const started = await startServer({ host: '127.0.0.1', port: 0 });
  server = started.server;
  baseUrl = `http://127.0.0.1:${started.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

function uniqueHealthsite(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test('creación persiste documento, lock e idempotencia en Firestore', async () => {
  const healthsiteId = uniqueHealthsite('persist-create');
  const idempotencyKey = `idem-${healthsiteId}`;

  const { response, body: created } = await createReferral(
    baseUrl,
    tokens,
    {
      destination: {
        healthsiteId,
        name: 'Centro Persistencia',
        address: 'Persist 1'
      }
    },
    { idempotencyKey }
  );
  assert.equal(response.status, 201);

  const stored = await fetchReferralDoc(created.id);
  assert.equal(stored.status, 'draft');
  assert.equal(stored.patientId, emulatorPatients[0].id);
  assert.equal(stored.destination.healthsiteId, healthsiteId);
  assert.equal(stored.createdBy, 'user-1');
  assert.equal(stored.responsibleId, 'user-1');

  const lock = await lockDocExists(emulatorPatients[0].id, healthsiteId);
  assert.equal(lock.referralId, created.id);

  const idem = await idempotencyDoc('user-1', idempotencyKey);
  assert.equal(idem.referralId, created.id);
  assert.ok(idem.bodyHash);

  const events = await listFirestoreEvents(created.id);
  assert.equal(events.length, 1);
  assert.equal(events[0].action, 'referral.created');
});

test('idempotencia en Firestore devuelve la misma derivación sin duplicar docs', async () => {
  const healthsiteId = uniqueHealthsite('idem-replay');
  const idempotencyKey = `replay-${healthsiteId}`;
  const payload = {
    destination: {
      healthsiteId,
      name: 'Centro Idempotencia',
      address: 'Idem 1'
    }
  };

  const first = await createReferral(baseUrl, tokens, payload, { idempotencyKey });
  assert.equal(first.response.status, 201);

  const replay = await createReferral(baseUrl, tokens, payload, { idempotencyKey });
  assert.equal(replay.response.status, 200);
  assert.equal(replay.body.id, first.body.id);

  const allReferrals = await db.collection('referrals').get();
  const matching = allReferrals.docs.filter(
    (doc) => doc.data().destination?.healthsiteId === healthsiteId
  );
  assert.equal(matching.length, 1);
});

test('idempotencia con distinto cuerpo responde 409 y no crea otro referral', async () => {
  const healthsiteId = uniqueHealthsite('idem-mismatch');
  const idempotencyKey = `mismatch-${healthsiteId}`;

  await createReferral(
    baseUrl,
    tokens,
    {
      destination: { healthsiteId, name: 'A', address: '1' },
      reason: 'Motivo A'
    },
    { idempotencyKey }
  );

  const conflict = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...headersFor(tokens, 'user')
    },
    body: JSON.stringify(
      referralBody(emulatorPatients[0].id, {
        destination: { healthsiteId, name: 'B', address: '2' },
        reason: 'Motivo B'
      })
    )
  });
  assert.equal(conflict.status, 409);

  const matching = (await db.collection('referrals').get()).docs.filter(
    (doc) => doc.data().destination?.healthsiteId === healthsiteId
  );
  assert.equal(matching.length, 1);
});

test('PATCH persiste cambios y agrega evento referral.updated', async () => {
  const healthsiteId = uniqueHealthsite('patch');
  const { body: created } = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId, name: 'Antes', address: 'Patch 1' },
    notes: 'original'
  });
  assert.ok(created.id);

  const patchResponse = await patchReferral(baseUrl, tokens, created.id, {
    reason: 'Motivo actualizado',
    notes: 'editado en borrador',
    priority: 'high'
  });
  assert.equal(patchResponse.status, 200);

  const stored = await fetchReferralDoc(created.id);
  assert.equal(stored.reason, 'Motivo actualizado');
  assert.equal(stored.notes, 'editado en borrador');
  assert.equal(stored.priority, 'high');

  const events = await listFirestoreEvents(created.id);
  assert.equal(events.length, 2);
  assert.equal(events[1].action, 'referral.updated');
});

test('PATCH con cambio de destino mueve el lock en Firestore', async () => {
  const fromHs = uniqueHealthsite('patch-from');
  const toHs = uniqueHealthsite('patch-to');
  const { body: created } = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId: fromHs, name: 'Origen', address: 'From 1' }
  });

  assert.ok(await lockDocExists(emulatorPatients[0].id, fromHs));
  assert.equal(await lockDocExists(emulatorPatients[0].id, toHs), null);

  const patchResponse = await patchReferral(baseUrl, tokens, created.id, {
    destination: {
      healthsiteId: toHs,
      name: 'Destino nuevo',
      address: 'To 1'
    }
  });
  assert.equal(patchResponse.status, 200);

  assert.equal(await lockDocExists(emulatorPatients[0].id, fromHs), null);
  const newLock = await lockDocExists(emulatorPatients[0].id, toHs);
  assert.equal(newLock.referralId, created.id);

  const stored = await fetchReferralDoc(created.id);
  assert.equal(stored.destination.healthsiteId, toHs);
});

test('ciclo aceptada y completada persiste timestamps y libera el lock', async () => {
  const healthsiteId = uniqueHealthsite('lifecycle-complete');
  const { body: created } = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId, name: 'Completa', address: 'LC 1' }
  });

  assert.ok(await lockDocExists(emulatorPatients[0].id, healthsiteId));

  await transitionReferral(baseUrl, tokens, created.id, 'submitted');
  await transitionReferral(baseUrl, tokens, created.id, 'accepted', { role: 'admin' });
  assert.ok(await lockDocExists(emulatorPatients[0].id, healthsiteId));

  await transitionReferral(baseUrl, tokens, created.id, 'completed', { role: 'admin' });

  const stored = await fetchReferralDoc(created.id);
  assert.equal(stored.status, 'completed');
  assert.ok(stored.submittedAt);
  assert.ok(stored.decidedAt);
  assert.ok(stored.closedAt);

  assert.equal(await lockDocExists(emulatorPatients[0].id, healthsiteId), null);

  const events = await listFirestoreEvents(created.id);
  assert.deepEqual(
    events.map((event) => event.action),
    [
      'referral.created',
      'referral.submitted',
      'referral.accepted',
      'referral.completed'
    ]
  );
});

test('rechazo persiste motivo, cierra y permite nueva derivación al mismo centro', async () => {
  const healthsiteId = uniqueHealthsite('reject-reopen');
  const { body: first } = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId, name: 'Rechazo', address: 'RJ 1' }
  });

  await transitionReferral(baseUrl, tokens, first.id, 'submitted');
  const rejectResponse = await transitionReferral(baseUrl, tokens, first.id, 'rejected', {
    role: 'admin',
    rejectionReason: 'Documentación incompleta'
  });
  assert.equal(rejectResponse.status, 200);

  const rejected = await fetchReferralDoc(first.id);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.rejectionReason, 'Documentación incompleta');
  assert.ok(rejected.closedAt);
  assert.equal(await lockDocExists(emulatorPatients[0].id, healthsiteId), null);

  const second = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId, name: 'Rechazo', address: 'RJ 1' },
    reason: 'Reintento'
  });
  assert.equal(second.response.status, 201);
  assert.notEqual(second.body.id, first.id);
  assert.ok(await lockDocExists(emulatorPatients[0].id, healthsiteId));
});

test('cancelación desde borrador elimina lock y bloquea duplicado abierto', async () => {
  const healthsiteId = uniqueHealthsite('cancel-draft');
  const { body: created } = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId, name: 'Cancel', address: 'CN 1' }
  });

  const cancelResponse = await transitionReferral(baseUrl, tokens, created.id, 'cancelled');
  assert.equal(cancelResponse.status, 200);

  const stored = await fetchReferralDoc(created.id);
  assert.equal(stored.status, 'cancelled');
  assert.ok(stored.closedAt);
  assert.equal(await lockDocExists(emulatorPatients[0].id, healthsiteId), null);

  const events = await listFirestoreEvents(created.id);
  assert.equal(events.at(-1).action, 'referral.cancelled');
});

test('DELETE de borrador borra referral, eventos y lock en Firestore', async () => {
  const healthsiteId = uniqueHealthsite('delete-draft');
  const { body: created } = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId, name: 'Borrar', address: 'DEL 1' }
  });

  const lockKey = openLockKey(emulatorPatients[0].id, healthsiteId);
  assert.ok(await db.collection('referralOpenLocks').doc(lockKey).get().then((s) => s.exists));

  const deleteResponse = await fetch(`${baseUrl}/api/v1/referrals/${created.id}`, {
    method: 'DELETE',
    headers: headersFor(tokens, 'user')
  });
  assert.equal(deleteResponse.status, 204);

  assert.equal(await fetchReferralDoc(created.id), null);
  const eventsSnap = await db
    .collection('referrals')
    .doc(created.id)
    .collection('events')
    .get();
  assert.equal(eventsSnap.size, 0);
  assert.equal(
    await db.collection('referralOpenLocks').doc(lockKey).get().then((s) => s.exists),
    false
  );
});

test('GET history coincide con subcolección events ordenada por at', async () => {
  const healthsiteId = uniqueHealthsite('history-sync');
  const { body: created } = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId, name: 'Historial', address: 'HS 1' }
  });

  await patchReferral(baseUrl, tokens, created.id, { notes: 'nota api' });
  await transitionReferral(baseUrl, tokens, created.id, 'submitted');

  const apiResponse = await fetch(`${baseUrl}/api/v1/referrals/${created.id}`, {
    headers: headersFor(tokens, 'user')
  });
  const apiBody = await apiResponse.json();

  const firestoreEvents = await listFirestoreEvents(created.id);
  assert.equal(apiBody.history.length, firestoreEvents.length);
  assert.deepEqual(
    apiBody.history.map((event) => event.action),
    firestoreEvents.map((event) => event.action)
  );
});

test('listado por status refleja documentos persistidos', async () => {
  const healthsiteId = uniqueHealthsite('list-status');
  const { body: created } = await createReferral(baseUrl, tokens, {
    destination: { healthsiteId, name: 'Filtro', address: 'FS 1' }
  });
  await transitionReferral(baseUrl, tokens, created.id, 'submitted');

  const listResponse = await fetch(
    `${baseUrl}/api/v1/referrals?status=submitted&patientId=${emulatorPatients[0].id}`,
    { headers: headersFor(tokens, 'user') }
  );
  const items = await listResponse.json();
  assert.ok(items.some((item) => item.id === created.id));

  const stored = await fetchReferralDoc(created.id);
  assert.equal(stored.status, 'submitted');
});

test('segundo POST al mismo paciente y centro devuelve 409 mientras el lock existe', async () => {
  const healthsiteId = uniqueHealthsite('dup-lock');
  const destination = {
    healthsiteId,
    name: 'Duplicado',
    address: 'DUP 1'
  };

  const first = await createReferral(baseUrl, tokens, { destination });
  assert.equal(first.response.status, 201);

  const duplicate = await createReferral(baseUrl, tokens, { destination, reason: 'Otro intento' });
  assert.equal(duplicate.response.status, 409);

  const docs = (await db.collection('referrals').get()).docs.filter(
    (doc) => doc.data().destination?.healthsiteId === healthsiteId
  );
  assert.equal(docs.length, 1);
});
