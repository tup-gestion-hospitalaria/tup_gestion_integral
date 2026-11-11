// Copiá este archivo a environment.development.ts (environment.development.ts está en .gitignore).
// `ng serve` usa la configuración development y reemplaza environment.ts por este archivo.
export const environment = {
  production: false,
  backendApiUrl: 'http://localhost:3100/api',

  firebaseConfig: {
    apiKey: 'demo-tup-gestion-integral',
    authDomain: '127.0.0.1',
    projectId: 'demo-tup-gestion-integral',
    storageBucket: 'demo-tup-gestion-integral.appspot.com',
    messagingSenderId: '0',
    appId: 'demo-tup-gestion-integral',
  },
};
