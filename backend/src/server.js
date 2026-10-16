import { startServer } from './start-server.js';

try {
  const { host, port } = await startServer();
  console.log(`API iniciada en http://${host}:${port}.`);
} catch (error) {
  console.error('No se pudo inicializar Firestore:', error);
  process.exitCode = 1;
}
