import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const indexPath = join(packageRoot, 'dist/frontend/browser/index.html');

const html = await readFile(indexPath, 'utf8');

if (!html.includes('<app-root>')) {
  console.error(`Missing <app-root> in ${indexPath}`);
  process.exit(1);
}

console.log(`Smoke check passed: ${indexPath}`);
