import { createApp } from '../src/app.js';
import { PatientStore } from '../src/patient-store.js';

const app = createApp(new PatientStore());
const server = app.listen(0);

await new Promise((resolve) => server.once('listening', resolve));

const { port } = server.address();
const response = await fetch(`http://127.0.0.1:${port}/health`);
const body = await response.json();

server.close();

if (response.status !== 200 || body.status !== 'ok') {
  console.error('Smoke check failed:', response.status, body);
  process.exit(1);
}

console.log('Smoke check passed: GET /health');
