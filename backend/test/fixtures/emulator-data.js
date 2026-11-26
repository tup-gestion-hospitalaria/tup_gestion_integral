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

export function buildPatientBusinessFields(overrides = {}) {
  return {
    fullName: 'Ana',
    lastName: 'Pérez',
    documentNumber: '30123456',
    birthDate: '15-03-1990',
    email: 'ana@example.test',
    phone: '',
    contactPreference: '',
    contactHours: '',
    city: 'La Plata',
    country: 'Argentina',
    privateCare: false,
    insuranceName: 'OSDE',
    affiliateNumber: '123456',
    plan: '',
    picture: 'https://example.test/ana.jpg',
    active: true,
    ...overrides
  };
}

export const emulatorPatients = [
  {
    id: 'patient-1',
    ...buildPatientBusinessFields({
      fullName: 'Ana',
      lastName: 'Perez',
      documentNumber: '30123456',
      email: 'ana@example.test'
    })
  },
  {
    id: 'patient-2',
    ...buildPatientBusinessFields({
      fullName: 'Juan',
      lastName: 'Lopez',
      documentNumber: '28987654',
      birthDate: '20-07-1985',
      email: 'juan@example.test',
      city: 'Berisso',
      picture: 'https://example.test/juan.jpg'
    })
  }
];
