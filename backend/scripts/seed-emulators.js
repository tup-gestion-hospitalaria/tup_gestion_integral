import { resetAndSeedEmulators } from '../test/support/emulators.js';

try {
  const result = await resetAndSeedEmulators();
  console.log(
    `Fixtures cargados: ${result.users} usuarios y ${result.patients} pacientes.`
  );
} catch (error) {
  console.error('No se pudieron cargar los fixtures del emulador:', error);
  process.exitCode = 1;
}
