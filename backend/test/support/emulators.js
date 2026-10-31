import { auth, db } from '../../src/firebase.js';
import {
  EMULATOR_PROJECT_ID,
  emulatorPatients,
  emulatorUsers
} from '../fixtures/emulator-data.js';

export function assertEmulatorEnvironment() {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    throw new Error(
      'Este comando requiere FIRESTORE_EMULATOR_HOST y FIREBASE_AUTH_EMULATOR_HOST.'
    );
  }

  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID;

  if (projectId !== EMULATOR_PROJECT_ID || !projectId.startsWith('demo-')) {
    throw new Error(
      `Proyecto inseguro para fixtures: ${projectId ?? '(sin definir)'}.`
    );
  }
}

async function clearAuth() {
  while (true) {
    const result = await auth.listUsers(1000);
    const uids = result.users.map((user) => user.uid);

    if (uids.length === 0) {
      return;
    }

    await auth.deleteUsers(uids);
  }
}

async function clearFirestore() {
  const collections = await db.listCollections();

  for (const collection of collections) {
    await db.recursiveDelete(collection);
  }
}

export async function resetAndSeedEmulators() {
  assertEmulatorEnvironment();
  await Promise.all([clearAuth(), clearFirestore()]);

  for (const user of emulatorUsers) {
    const { role, ...userData } = user;
    const createdUser = await auth.createUser(userData);
    await auth.setCustomUserClaims(createdUser.uid, { role });
  }

  const batch = db.batch();

  for (const { id, ...patient } of emulatorPatients) {
    batch.set(db.collection('patients').doc(id), patient);
    batch.set(db.collection('patientDocuments').doc(patient.documentNumber), {
      patientId: id
    });
  }

  await batch.commit();

  return {
    users: emulatorUsers.length,
    patients: emulatorPatients.length
  };
}
