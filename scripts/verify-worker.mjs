import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const miniflarePath = require.resolve('miniflare', {
  paths: [dirname(require.resolve('wrangler/package.json'))],
});
const { Miniflare } = await import(pathToFileURL(miniflarePath).href);
const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
const bindings = parseEnv(await readFile('.env.local', 'utf8'));
const qa = process.argv.includes('--qa');
const port = qa ? 3101 : 3100;
bindings.APP_ORIGIN = `http://localhost:${port}`;
if (qa) bindings.SUPABASE_URL = 'http://127.0.0.1:55433';
const moduleFiles = (await readdir('dist/server', { recursive: true })).filter(
  (path) => path.endsWith('.js') && path !== 'index.js',
);
const modules = [
  { type: 'ESModule', path: resolve('dist/server/index.js') },
  ...moduleFiles.map((path) => ({
    type: 'ESModule',
    path: resolve('dist/server', path),
  })),
];
const mf = new Miniflare({
  host: '127.0.0.1',
  port,
  modules,
  modulesRoot: resolve('dist/server'),
  compatibilityDate: config.compatibility_date,
  compatibilityFlags: config.compatibility_flags,
  bindings,
  assets: {
    directory: resolve('dist/client'),
    binding: 'ASSETS',
    routerConfig: { has_user_worker: true },
  },
});
try {
  await mf.ready;
  const page = await mf.dispatchFetch(bindings.APP_ORIGIN + '/indi');
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('Our Mailbox'));
  const asset = await mf.dispatchFetch(
    bindings.APP_ORIGIN + '/fonts/pixelify-sans-latin-400-normal.woff2',
  );
  assert.equal(asset.status, 200);
  const letter = await mf.dispatchFetch(
    bindings.APP_ORIGIN + '/api/indi/letters',
  );
  assert.equal(letter.status, 200);
  assert.ok((await letter.json()).established_at);
  console.log(
    'Built Worker passed: page rendering, local font assets, password-free mailbox access and PostgreSQL access.',
  );
  if (process.argv.includes('--serve')) {
    console.log(
      `Built Worker ${qa ? 'isolated QA' : 'preview'} ready at http://localhost:${port}`,
    );
    await new Promise((resolve) => {
      process.once('SIGINT', resolve);
      process.once('SIGTERM', resolve);
    });
  }
} finally {
  await mf.dispose();
}
