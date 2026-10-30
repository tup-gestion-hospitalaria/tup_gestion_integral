// LOCAL-DEV-ONLY — overlay de pruebas personales, no versionar.
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

import { environment } from '../environments/environment';

const app = initializeApp(environment.firebaseConfig);

export const auth = getAuth(app);

if (!auth.emulatorConfig) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
