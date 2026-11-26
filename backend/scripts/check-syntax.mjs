import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL('..', import.meta.url));

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }

      files.push(...(await collectJavaScriptFiles(fullPath)));
      continue;
    }

    if (extname(entry.name) === '.js') {
      files.push(fullPath);
    }
  }

  return files;
}

for (const folder of ['src', 'scripts']) {
  const files = await collectJavaScriptFiles(join(packageRoot, folder));

  for (const file of files) {
    await execFileAsync(process.execPath, ['--check', file]);
  }
}
