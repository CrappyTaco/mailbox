import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { getEnvironment, ConfigurationError } from '../lib/server/env';
import { rpc } from '../lib/server/database';
import { endpoint, json } from '../lib/server/endpoint';

const variables = [
  'APP_ORIGIN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LOCAL_PREVIEW',
] as const;
const original = Object.fromEntries(
  variables.map((name) => [name, process.env[name]]),
);
const secret = 'test-only-private-key';
beforeEach(() =>
  Object.assign(process.env, {
    APP_ORIGIN: 'https://mailbox.example',
    SUPABASE_URL: 'https://database.example',
    SUPABASE_SERVICE_ROLE_KEY: secret,
    LOCAL_PREVIEW: 'false',
  }),
);
afterEach(() => {
  for (const name of variables) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});

function snapshot() {
  return endpoint(
    new Request('https://mailbox.example/api/indi/letters'),
    Promise.resolve({ owner: 'indi' }),
    async (owner) => json(await rpc('mailbox_snapshot', { p_owner: owner })),
  );
}

void test('missing runtime settings stop before fetching and log names without values', async (t) => {
  delete process.env.APP_ORIGIN;
  delete process.env.SUPABASE_URL;
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('must not fetch');
  });
  const log = t.mock.method(console, 'error', () => {});
  const response = await snapshot();
  assert.equal(response.status, 503);
  assert.equal(fetch.mock.callCount(), 0);
  assert.deepEqual(log.mock.calls[0].arguments, [
    'mailbox_connection_failed',
    {
      code: 'server_not_configured',
      variables: ['SUPABASE_URL', 'APP_ORIGIN'],
    },
  ]);
  const publicBody = await response.text();
  for (const value of [...variables, secret])
    assert.ok(!publicBody.includes(value));
});

void test('production rejects local HTTP settings and malformed URLs with safe diagnostics', () => {
  process.env.SUPABASE_URL = 'http://127.0.0.1:55432';
  assert.throws(getEnvironment, { code: 'https_required' });
  process.env.SUPABASE_URL = 'not-a-url-with-private-data';
  assert.throws(getEnvironment, (error) => {
    assert.ok(error instanceof ConfigurationError);
    assert.equal(error.code, 'invalid_url');
    assert.deepEqual(error.variables, ['SUPABASE_URL']);
    assert.ok(!error.message.includes('private-data'));
    return true;
  });
});

void test('empty mail is a successful snapshot fetched with server runtime credentials', async (t) => {
  const empty = {
    latest: null,
    received: null,
    last_incoming_at: null,
    established_at: '2026-09-15T00:00:00Z',
  };
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      assert.equal(
        url,
        'https://database.example/rest/v1/rpc/mailbox_snapshot',
      );
      assert.equal(options.method, 'POST');
      const headers = new Headers(options.headers);
      assert.equal(headers.get('apikey'), secret);
      assert.equal(headers.get('authorization'), `Bearer ${secret}`);
      assert.equal(typeof options.body, 'string');
      assert.deepEqual(JSON.parse(options.body as string), { p_owner: 'indi' });
      return Response.json(empty);
    },
  );
  const response = await snapshot();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), empty);
  assert.match(response.headers.get('cache-control')!, /no-store/);
});

void test('upstream authentication, missing migrations and outages are distinguishable without leaking mail', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  for (const [status, code] of [
    [401, 'PGRST301'],
    [404, 'PGRST202'],
    [500, 'XX000'],
  ] as const) {
    t.mock.method(globalThis, 'fetch', async () =>
      Response.json({ code, message: `private letter ${secret}` }, { status }),
    );
    const response = await snapshot();
    assert.equal(response.status, 503);
    assert.deepEqual(log.mock.calls.at(-1)?.arguments, [
      'mailbox_connection_failed',
      {
        code: 'database_unavailable',
        status,
        upstreamCode: code,
      },
    ]);
    assert.ok(!(await response.text()).includes(secret));
  }
  assert.ok(
    !JSON.stringify(log.mock.calls.map((call) => call.arguments)).includes(
      secret,
    ),
  );
});

void test('a transient timeout returns 503, then a real retry returns the fresh snapshot', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  let calls = 0;
  const empty = {
    latest: null,
    last_incoming_at: null,
    established_at: '2026-09-15T00:00:00Z',
  };
  t.mock.method(globalThis, 'fetch', async () => {
    if (++calls === 1)
      throw new DOMException(`private ${secret}`, 'TimeoutError');
    return Response.json(empty);
  });
  assert.equal((await snapshot()).status, 503);
  assert.deepEqual(log.mock.calls[0].arguments, [
    'mailbox_connection_failed',
    { code: 'database_timeout' },
  ]);
  const recovered = await snapshot();
  assert.equal(recovered.status, 200);
  assert.deepEqual(await recovered.json(), empty);
  assert.equal(calls, 2);
});

void test('non-JSON upstream errors retain status while normal letter conflicts remain 409', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('private response', { status: 502 }),
  );
  assert.equal((await snapshot()).status, 503);
  assert.deepEqual(log.mock.calls[0].arguments, [
    'mailbox_connection_failed',
    {
      code: 'database_unavailable',
      status: 502,
      upstreamCode: undefined,
    },
  ]);
  fetch.mock.mockImplementation(async () =>
    Response.json(
      { message: 'waiting_for_reply', code: 'P0001' },
      { status: 400 },
    ),
  );
  assert.equal((await snapshot()).status, 409);
  assert.equal(log.mock.callCount(), 1);
});
