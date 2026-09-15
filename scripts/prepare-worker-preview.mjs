import { readFile, writeFile } from 'node:fs/promises';
// Wrangler resolves .dev.vars beside the generated Worker configuration.
// This copy is ignored and never included in source exports.
let values = await readFile('.dev.vars', 'utf8');
if (process.argv[2]) {
  const origin = new URL(process.argv[2]);
  if (!['localhost', '127.0.0.1'].includes(origin.hostname))
    throw new Error('Local preview origins only.');
  values = values.replace(/^APP_ORIGIN=.*$/m, 'APP_ORIGIN=' + origin.origin);
}
await writeFile('dist/server/.dev.vars', values, { mode: 0o600 });
console.log(
  'Local preview secrets copied beside the generated Worker configuration.',
);
