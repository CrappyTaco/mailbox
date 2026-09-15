import { newLetterDocument, makeStamp } from '../lib/letter-document';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPasscode,
  verifyPasscode,
  createSession,
  verifySession,
  sessionCookie,
} from '../lib/server/auth';
import { letterSchema } from '../lib/validation';
import {
  protectOrigin,
  parseBody,
  endpoint,
  json,
} from '../lib/server/endpoint';
let hash: string;
const secret = 'test-session-secret-'.repeat(4);
before(async () => {
  hash = await hashPasscode('test-only-long-passphrase');
  Object.assign(process.env, {
    LOCAL_PREVIEW: 'true',
    APP_ORIGIN: 'http://localhost:3000',
    SESSION_SECRET: secret,
    INDI_PASSCODE_HASH: hash,
    AUGGIE_PASSCODE_HASH: hash,
  });
});
void test('correct passcode verifies; wrong passcode and corrupt hashes fail', async () => {
  assert.ok(await verifyPasscode('test-only-long-passphrase', hash));
  assert.equal(await verifyPasscode('incorrect', hash), false);
  assert.equal(await verifyPasscode('anything', 'broken'), false);
});
void test('salt changes independently for identical passcodes', async () =>
  assert.notEqual(hash, await hashPasscode('test-only-long-passphrase')));
void test('session grants only its own mailbox', async () => {
  const token = await createSession('indi', secret, hash);
  assert.ok(await verifySession(token, 'indi', secret, hash));
  assert.equal(await verifySession(token, 'auggie', secret, hash), false);
});
void test('expired, tampered, and revoked sessions are rejected', async () => {
  const expired = await createSession('indi', secret, hash, 1);
  const token = await createSession('indi', secret, hash);
  assert.equal(await verifySession(expired, 'indi', secret, hash), false);
  assert.equal(await verifySession(token + 'x', 'indi', secret, hash), false);
  assert.equal(
    await verifySession(
      token,
      'indi',
      secret,
      await hashPasscode('changed-passphrase'),
    ),
    false,
  );
});
void test('production cookies are private, strict, secure and expire', () => {
  const cookie = sessionCookie('indi', 'token', false);
  for (const flag of [
    'HttpOnly',
    'SameSite=Strict',
    'Secure',
    'Max-Age=1209600',
    'Path=/',
  ])
    assert.ok(cookie.includes(flag));
  assert.ok(!sessionCookie('indi', 'token', true).includes('Secure'));
});
void test('mailbox reads need no password or session and remain uncached', async () => {
  const response = await endpoint(
    new Request('http://localhost:3000/api/indi/letters'),
    Promise.resolve({ owner: 'indi' }),
    async (owner) => json({ owner }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { owner: 'indi' });
  assert.equal(
    response.headers.get('Cache-Control'),
    'private, no-store, max-age=0',
  );
});
void test('both owners can use letter actions without a session', async () => {
  for (const owner of ['indi', 'auggie']) {
    for (const resource of ['letters', 'letters/read']) {
      const response = await endpoint(
        new Request(`http://localhost:3000/api/${owner}/${resource}`, {
          method: 'POST',
          headers: { origin: 'http://localhost:3000' },
        }),
        Promise.resolve({ owner }),
        async (selected) => json({ owner: selected }),
      );
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { owner });
    }
  }
});
void test('unknown owners are rejected', async () =>
  assert.equal(
    (
      await endpoint(
        new Request('http://localhost:3000/api/no/letters'),
        Promise.resolve({ owner: 'no' }),
        async () => json({}),
      )
    ).status,
    404,
  ));
void test('cross-origin mutations and missing origins are rejected', () => {
  assert.throws(() =>
    protectOrigin(
      new Request('http://localhost:3000/api/indi/auth', {
        method: 'POST',
        headers: { origin: 'https://elsewhere.example' },
      }),
    ),
  );
  assert.throws(() =>
    protectOrigin(
      new Request('http://localhost:3000/api/indi/auth', { method: 'POST' }),
    ),
  );
  assert.doesNotThrow(() =>
    protectOrigin(
      new Request('http://localhost:3000/api/indi/auth', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      }),
    ),
  );
});
const validationArt = newLetterDocument('Indi');
validationArt.text.body.text = 'A small hello.';
validationArt.text.signature.text = 'Auggie';
validationArt.objects = [makeStamp('flower', 'validation')];
const valid = {
  artwork: validationArt,
  body: 'A small hello.',
  reply_to: null,
  client_id: crypto.randomUUID(),
};
void test('message validation rejects blank, oversized, malformed IDs, and identity spoofing', () => {
  for (const value of [
    { ...valid, body: ' ' },
    { ...valid, body: 'x'.repeat(20001) },
    { ...valid, client_id: 'bad' },
    { ...valid, sender: 'auggie' },
  ])
    assert.equal(letterSchema.safeParse(value).success, false);
  assert.ok(letterSchema.safeParse(valid).success);
});
void test('request reader limits byte size independently of content-length', async () => {
  const request = new Request('http://localhost:3000', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...valid, body: 'a'.repeat(100000) }),
  });
  await assert.rejects(() => parseBody(request, letterSchema));
});
void test('malformed JSON and form posts are rejected', async () => {
  for (const [contentType, body] of [
    ['application/json', '{bad'],
    ['text/plain', 'hi'],
  ]) {
    await assert.rejects(() =>
      parseBody(
        new Request('http://localhost:3000', {
          method: 'POST',
          headers: { 'content-type': contentType },
          body,
        }),
        letterSchema,
      ),
    );
  }
});
