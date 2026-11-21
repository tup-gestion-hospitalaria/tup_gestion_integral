// Copiá este archivo a firebase.ts (firebase.ts está en .gitignore).
import type { Auth } from 'firebase/auth';

let authInstance: Auth | null = null;
let authInitPromise: Promise<Auth> | null = null;

async function initializeFirebaseAuth(): Promise<Auth> {
  if (authInstance) {
    return authInstance;
  }

  if (!authInitPromise) {
    authInitPromise = (async () => {
      const [{ initializeApp }, { getAuth }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
      ]);
      const { environment } = await import('../environments/environment');
      const app = initializeApp(environment.firebaseConfig);
      authInstance = getAuth(app);
      return authInstance;
    })();
  }

  return authInitPromise;
}

export const firebaseAuthLoader = {
  getAuth: initializeFirebaseAuth,
};

export function getFirebaseAuth(): Promise<Auth> {
  return firebaseAuthLoader.getAuth();
}
