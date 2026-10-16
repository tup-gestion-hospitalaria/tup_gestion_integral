export const EMULATOR_PROJECT_ID = 'demo-tup-gestion-integral';

export const emulatorUsers = [
  {
    uid: 'user-1',
    email: 'user@example.test',
    password: 'User1234!',
    displayName: 'Usuario de prueba',
    role: 'user'
  },
  {
    uid: 'admin-1',
    email: 'admin@example.test',
    password: 'Admin1234!',
    displayName: 'Administrador de prueba',
    role: 'admin'
  }
];

export const emulatorPatients = [
  {
    id: 'patient-1',
    fullName: 'Ana Perez',
    email: 'ana@example.test',
    city: 'La Plata',
    country: 'Argentina',
    picture: 'https://example.test/ana.jpg',
    active: true
  },
  {
    id: 'patient-2',
    fullName: 'Juan Lopez',
    email: 'juan@example.test',
    city: 'Berisso',
    country: 'Argentina',
    picture: 'https://example.test/juan.jpg',
    active: true
  }
];
