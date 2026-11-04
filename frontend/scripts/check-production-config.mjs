import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(
  new URL('../dist/frontend/browser/', import.meta.url)
);
const forbiddenValues = [
  'http://localhost:3000',
  'http://127.0.0.1:9099',
  'demo-tup-gestion-integral'
];
const expectedBackendUrl = 'https://tup-gestion-integral.onrender.com/api';

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJavaScriptFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path);
    }
  }

  return files;
}

const javaScriptFiles = await listJavaScriptFiles(outputDirectory);
const bundle = (
  await Promise.all(javaScriptFiles.map((file) => readFile(file, 'utf8')))
).join('\n');

for (const value of forbiddenValues) {
  if (bundle.includes(value)) {
    throw new Error(`El build de producción contiene una configuración prohibida: ${value}`);
  }
}

if (!bundle.includes(expectedBackendUrl)) {
  throw new Error('El build de producción no contiene la URL esperada del backend.');
}

console.log('Configuración del build de producción verificada.');
