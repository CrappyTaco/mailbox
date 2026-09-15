// Exercise the compiled Worker with production-style runtime bindings. No
// .env files, real credentials, external requests, or personal letters are used.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { Miniflare, Response: WorkerResponse } = require(
  require.resolve('miniflare', {
    paths: [dirname(require.resolve('wrangler/package.json'))],
  }),
);
const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
assert.equal(
  config.keep_vars,
  true,
  'Deployments must preserve dashboard variables',
);
assert.equal(config.vars.APP_ORIGIN, 'https://auggieisromantic.uk');
assert.equal(config.vars.LOCAL_PREVIEW, 'false');
const files = (await readdir('dist/server', { recursive: true })).filter(
  (path) => path.endsWith('.js') && path !== 'index.js',
);
const options = {
  modules: ['index.js', ...files].map((path) => ({
    type: 'ESModule',
    path: resolve('dist/server', path),
  })),
  modulesRoot: resolve('dist/server'),
  compatibilityDate: config.compatibility_date,
  compatibilityFlags: config.compatibility_flags,
  assets: {
    directory: resolve('dist/client'),
    binding: 'ASSETS',
    routerConfig: { has_user_worker: true },
  },
};
let calls = 0;
const key = 'isolated-worker-test-key';
const empty = {
  latest: null,
  received: null,
  last_incoming_at: null,
  established_at: '2026-09-15T00:00:00Z',
};
const outboundService = async (request) => {
  calls++;
  assert.equal(
    request.url,
    'https://database.example/rest/v1/rpc/mailbox_snapshot',
  );
  assert.equal(request.headers.get('apikey'), key);
  assert.equal(request.headers.get('authorization'), `Bearer ${key}`);
  assert.ok(['indi', 'auggie'].includes((await request.json()).p_owner));
  return WorkerResponse.json(empty);
};
const unavailable = new Miniflare({
  ...options,
  bindings: config.vars,
  outboundService,
});
try {
  const response = await unavailable.dispatchFetch(
    config.vars.APP_ORIGIN + '/api/indi/letters',
  );
  assert.equal(
    response.status,
    503,
    'Missing database secrets must fail honestly',
  );
  assert.equal(
    calls,
    0,
    'Missing credentials must never make an upstream request',
  );
  assert.ok(!(await response.text()).includes('SUPABASE'));
} finally {
  await unavailable.dispose();
}
const configured = new Miniflare({
  ...options,
  bindings: {
    ...config.vars,
    SUPABASE_URL: 'https://database.example',
    SUPABASE_SERVICE_ROLE_KEY: key,
  },
  outboundService,
});
try {
  for (const owner of ['indi', 'auggie']) {
    const response = await configured.dispatchFetch(
      config.vars.APP_ORIGIN + `/api/${owner}/letters`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), empty);
  }
  assert.equal(calls, 2);
} finally {
  await configured.dispose();
}
console.log(
  'Compiled Worker: production vars retained, missing secrets return 503, runtime credentials reach HTTPS RPC, empty mail returns 200 for both worlds.',
);
