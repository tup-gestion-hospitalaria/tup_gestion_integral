import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../dist/frontend/browser/', import.meta.url));
const files = (await readdir(directory)).filter((file) => file.endsWith('.js'));
const bundle = (
  await Promise.all(files.map((file) => readFile(join(directory, file), 'utf8')))
).join('\n');
const forbidden = ['localhost:3000', '127.0.0.1:9099', 'demo-tup-gestion-integral'];
const invalidValue = forbidden.find((value) => bundle.includes(value));

if (invalidValue) {
  throw new Error(`Configuración local en el build productivo: ${invalidValue}`);
}
if (!bundle.includes('https://tup-gestion-integral.onrender.com/api')) {
  throw new Error('El build no contiene la URL productiva del backend.');
}

console.log('Configuración productiva verificada.');
