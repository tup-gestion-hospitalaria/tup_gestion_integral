import { createApp } from './app.js';
import { PatientStore } from './patient-store.js';
import { fetchInitialPatients } from './seed-patients.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  const initialPatients = await fetchInitialPatients();
  const app = createApp(new PatientStore(initialPatients));

  app.listen(port, host, () => {
    console.log(
      `API iniciada en http://${host}:${port} con ${initialPatients.length} pacientes.`
    );
  });
} catch (error) {
  console.error('No se pudo inicializar la base de datos en memoria:', error);
  process.exitCode = 1;
}
