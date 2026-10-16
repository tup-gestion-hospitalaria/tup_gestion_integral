import { createApp } from './app.js';
import { auth, db } from './firebase.js';
import { FirestorePatientStore } from './firestore-patient-store.js';
import { FirestoreUserStore } from './firestore-user-store.js';

export async function startServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';
  const store = options.store ?? new FirestorePatientStore(db);
  const userStore = options.userStore ?? new FirestoreUserStore(db);
  const verifyIdToken =
    options.verifyIdToken ?? ((token) => auth.verifyIdToken(token, true));
  const setCustomUserClaims =
    options.setCustomUserClaims ??
    ((uid, claims) => auth.setCustomUserClaims(uid, claims));
  const revokeRefreshTokens =
    options.revokeRefreshTokens ?? ((uid) => auth.revokeRefreshTokens(uid));
  const app = createApp(store, {
    userStore,
    verifyIdToken,
    setCustomUserClaims,
    revokeRefreshTokens
  });
  const server = app.listen(port, host);

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();

  return {
    app,
    server,
    host,
    port: typeof address === 'object' && address ? address.port : port
  };
}
