import "dotenv/config";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  const configuredValues = [projectId, clientEmail, privateKey];
  const hasSomeRenderCredentials = configuredValues.some(Boolean);
  const hasAllRenderCredentials = configuredValues.every(Boolean);

  if (hasSomeRenderCredentials && !hasAllRenderCredentials) {
    throw new Error(
      "Las credenciales de Firebase están incompletas. Se requieren FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.",
    );
  }

  if (hasAllRenderCredentials) {
    return cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }

  return applicationDefault();
}

const options = {
  credential: getCredential(),
};

if (process.env.FIREBASE_PROJECT_ID) {
  options.projectId = process.env.FIREBASE_PROJECT_ID;
}

const firebaseApp = getApps()[0] ?? initializeApp(options);

export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
