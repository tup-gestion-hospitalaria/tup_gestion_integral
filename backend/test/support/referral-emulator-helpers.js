import { openLockKey } from '../../src/referral-schema.js';
import { db } from '../../src/firebase.js';
import { emulatorPatients } from '../fixtures/emulator-data.js';

export async function signIn(email, password) {
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

export function headersFor(tokens, role, extra = {}) {
  return { Authorization: `Bearer ${tokens.get(role)}`, ...extra };
}

export function referralBody(patientId = emulatorPatients[0].id, overrides = {}) {
  return {
    patientId,
    destination: {
      healthsiteId: 'emulator-hs-1',
      name: 'Hospital Emulator',
      address: 'Calle Emulator 100'
    },
    reason: 'Consulta especializada',
    notes: null,
    ...overrides
  };
}

export async function fetchReferralDoc(referralId) {
  const snap = await db.collection('referrals').doc(referralId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function listFirestoreEvents(referralId) {
  const snap = await db
    .collection('referrals')
    .doc(referralId)
    .collection('events')
    .get();
  return snap.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((left, right) => left.at.localeCompare(right.at));
}

export async function lockDocExists(patientId, healthsiteId) {
  const key = openLockKey(patientId, healthsiteId);
  const snap = await db.collection('referralOpenLocks').doc(key).get();
  return snap.exists ? snap.data() : null;
}

export async function idempotencyDoc(userId, key) {
  const snap = await db.collection('referralIdempotency').doc(`${userId}__${key}`).get();
  return snap.exists ? snap.data() : null;
}

export async function createReferral(baseUrl, tokens, overrides = {}, options = {}) {
  const { role = 'user', idempotencyKey, patientId, bodyOverrides } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...headersFor(tokens, role)
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${baseUrl}/api/v1/referrals`, {
    method: 'POST',
    headers,
    body: JSON.stringify(referralBody(patientId, { ...overrides, ...bodyOverrides }))
  });

  return { response, body: response.ok || response.status === 409 ? await response.json().catch(() => null) : await response.json().catch(() => null) };
}

export async function transitionReferral(baseUrl, tokens, referralId, to, extra = {}) {
  return fetch(`${baseUrl}/api/v1/referrals/${referralId}/transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headersFor(tokens, extra.role ?? 'user') },
    body: JSON.stringify({ to, rejectionReason: extra.rejectionReason })
  });
}

export async function patchReferral(baseUrl, tokens, referralId, patch, role = 'user') {
  return fetch(`${baseUrl}/api/v1/referrals/${referralId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headersFor(tokens, role) },
    body: JSON.stringify(patch)
  });
}
