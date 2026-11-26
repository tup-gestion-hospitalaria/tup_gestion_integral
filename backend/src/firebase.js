import 'dotenv/config';

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp
} from 'firebase-admin/app';

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const emulatorHosts = [
  process.env.FIRESTORE_EMULATOR_HOST,
  process.env.FIREBASE_AUTH_EMULATOR_HOST
];
const usesEmulators = emulatorHosts.every(Boolean);

if (emulatorHosts.some(Boolean) && !usesEmulators) {
  throw new Error(
    'La configuración local requiere los emuladores de Firestore y Authentication.'
  );
}

function getCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  const configuredValues = [projectId, clientEmail, privateKey];
  const hasSomeRenderCredentials = configuredValues.some(Boolean);
  const hasAllRenderCredentials = configuredValues.every(Boolean);

  if (hasSomeRenderCredentials && !hasAllRenderCredentials) {
    throw new Error(
      'Las credenciales de Firebase están incompletas. Se requieren FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.'
    );
  }

  if (hasAllRenderCredentials) {
    return cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n')
    });
  }

  return applicationDefault();
}

const options = usesEmulators ? {} : { credential: getCredential() };

const projectId =
  process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID;

if (projectId) {
  options.projectId = projectId;
}

const firebaseApp = getApps()[0] ?? initializeApp(options);

export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
