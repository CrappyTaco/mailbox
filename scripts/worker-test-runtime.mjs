import './cloudflare-local-env.mjs';
import { resolve } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from './d1-test.mjs';
export async function workerRuntime({
  port,
  database = true,
  persist = false,
  production = false,
} = {}) {
  const config = JSON.parse(
    await readFile('dist/server/wrangler.json', 'utf8'),
  );
  const files = (await readdir('dist/server', { recursive: true })).filter(
    (path) => path.endsWith('.js') && path !== 'index.js',
  );
  const origin = production
    ? config.vars.APP_ORIGIN
    : `http://localhost:${port ?? 3101}`;
  const mf = new Miniflare({
    ...(port ? { host: '127.0.0.1', port } : {}),
    modules: ['index.js', ...files].map((path) => ({
      type: 'ESModule',
      path: resolve('dist/server', path),
    })),
    modulesRoot: resolve('dist/server'),
    compatibilityDate: config.compatibility_date,
    compatibilityFlags: config.compatibility_flags,
    bindings: {
      APP_ORIGIN: origin,
      LOCAL_PREVIEW: production ? 'false' : 'true',
    },
    ...(database
      ? {
          d1Databases: { MAILBOX_DB: persist ? 'mailbox-local' : 'mailbox-qa' },
          d1Persist: persist,
        }
      : {}),
    assets: {
      directory: resolve('dist/client'),
      binding: 'ASSETS',
      routerConfig: { has_user_worker: true },
    },
  });
  await mf.ready;
  return { mf, origin, config };
}
