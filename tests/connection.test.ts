import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { getEnvironment, ConfigurationError } from '../lib/server/env';
import { MailboxDatabase, DatabaseError } from '../lib/server/database';
import { endpoint, json } from '../lib/server/endpoint';
const variables = ['APP_ORIGIN', 'LOCAL_PREVIEW'] as const;
const original = Object.fromEntries(
  variables.map((name) => [name, process.env[name]]),
);
beforeEach(() =>
  Object.assign(process.env, {
    APP_ORIGIN: 'https://mailbox.example',
    LOCAL_PREVIEW: 'false',
  }),
);
afterEach(() => {
  for (const name of variables) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});
const handle = (action: () => Promise<unknown>) =>
  endpoint(
    new Request('https://mailbox.example/api/indi/letters'),
    Promise.resolve({ owner: 'indi' }),
    async () => json(await action()),
  );
void test('only the browser origin is required in text settings', () => {
  assert.deepEqual(getEnvironment(), {
    APP_ORIGIN: 'https://mailbox.example',
    LOCAL_PREVIEW: false,
  });
  delete process.env.APP_ORIGIN;
  assert.throws(getEnvironment, { code: 'app_origin_missing' });
});
void test('invalid production/local origins have safe diagnostics', () => {
  for (const value of [
    'http://localhost:3000',
    'invalid-private-value',
    'https://mailbox.example/path',
  ]) {
    process.env.APP_ORIGIN = value;
    assert.throws(
      getEnvironment,
      (error) =>
        error instanceof ConfigurationError && !error.message.includes(value),
    );
  }
  process.env.LOCAL_PREVIEW = 'true';
  process.env.APP_ORIGIN = 'https://mailbox.example';
  assert.throws(getEnvironment, { code: 'invalid_local_configuration' });
  process.env.APP_ORIGIN = 'http://localhost:3000';
  assert.equal(getEnvironment().LOCAL_PREVIEW, true);
});
void test('D1 missing schema and outages return 503 without exposing SQL or mail', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  for (const [message, code] of [
    ['D1_ERROR: no such table: letters', 'd1_migrations_missing'],
    ['D1_ERROR: secret letter text SELECT private_data', 'd1_unavailable'],
  ]) {
    const db = new MailboxDatabase({
      prepare() {
        throw new Error(message);
      },
    } as unknown as D1Database);
    const response = await handle(() => db.snapshot('indi'));
    assert.equal(response.status, 503);
    assert.deepEqual(log.mock.calls.at(-1)?.arguments, [
      'mailbox_database_failed',
      { code, operation: 'snapshot' },
    ]);
    assert.ok(!(await response.text()).includes(message));
  }
  assert.ok(!JSON.stringify(log.mock.calls).includes('private_data'));
});
void test('missing D1 binding is actionable in logs but generic in browser', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const response = await handle(async () => {
    throw new ConfigurationError('d1_binding_missing', ['MAILBOX_DB']);
  });
  assert.equal(response.status, 503);
  assert.deepEqual(log.mock.calls[0].arguments, [
    'mailbox_database_failed',
    { code: 'd1_binding_missing', variables: ['MAILBOX_DB'] },
  ]);
  assert.ok(!(await response.text()).includes('MAILBOX_DB'));
});
void test('transient failures recover on the next request; empty mail succeeds and stays uncached', async (t) => {
  t.mock.method(console, 'error', () => {});
  const empty = {
    latest: null,
    received: null,
    established_at: '2026-09-15T00:00:00Z',
    last_incoming_at: null,
  };
  let calls = 0;
  const action = async () => {
    if (++calls === 1) throw new DatabaseError('d1_unavailable', 'snapshot');
    return empty;
  };
  assert.equal((await handle(action)).status, 503);
  const recovered = await handle(action);
  assert.equal(recovered.status, 200);
  assert.deepEqual(await recovered.json(), empty);
  assert.match(recovered.headers.get('cache-control')!, /no-store/);
});
void test('letter conflicts, missing letters and size errors retain their HTTP status', async () => {
  for (const [code, status] of [
    ['waiting_for_reply', 409],
    ['open_letter_first', 409],
    ['conversation_changed', 409],
    ['idempotency_conflict', 409],
    ['letter_not_found', 404],
    ['invalid_artwork', 400],
    ['invalid_body', 400],
  ] as const) {
    assert.equal(
      (
        await handle(async () => {
          throw new DatabaseError(code);
        })
      ).status,
      status,
    );
  }
});
