import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Letter, MailboxSnapshot, Owner } from '../lib/mailbox-state';
import { newLetterDocument, makeStamp } from '../lib/letter-document';
import { builtinStickers } from '../lib/builtin-stickers';
import { paginateDocument } from '../lib/letter-pages';
function decorated(body: string, sender: Owner) {
  const doc = newLetterDocument(sender === 'indi' ? 'Auggie' : 'Indi');
  doc.text.body = {
    ...doc.text.body,
    text: body,
    font: 'typewriter',
    size: 22,
    color: '#54799c',
  };
  doc.text.signature = {
    ...doc.text.signature,
    text: sender,
    font: 'handwriting',
  };
  doc.objects = [
    {
      ...makeStamp('flower', 'postage'),
      x: 490,
      y: 110,
      width: 92,
      height: 115,
      rotation: 6,
    },
    {
      id: 'pixel-heart',
      type: 'sticker',
      asset: builtinStickers[0].asset,
      x: 140,
      y: 420,
      width: 96,
      height: 96,
      rotation: -9,
    },
    {
      id: 'uploaded-png',
      type: 'sticker',
      asset:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
      x: 410,
      y: 520,
      width: 80,
      height: 100,
      rotation: 3,
    },
  ];
  doc.strokes = [
    {
      color: '#59434b',
      width: 4,
      points: [
        [110, 580],
        [200, 580],
      ],
    },
    {
      color: '#59434b',
      width: 4,
      points: [
        [230, 580],
        [350, 580],
      ],
    },
  ];
  doc.objects = doc.objects.map((o, page) => ({
    ...o,
    page,
    rotation: page === 1 ? 273 : o.rotation,
  }));
  doc.strokes = doc.strokes.map((s, page) => ({ ...s, page: page + 1 }));
  return paginateDocument(doc, (s) => s.length * 12);
}
const origin = process.env.MAILBOX_TEST_ORIGIN ?? 'http://localhost:3101';
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
  new URL(origin).port !== '3101'
)
  throw new Error(
    'End-to-end tests require the isolated QA Worker on port 3101; never run against personal mail.',
  );
const cookies: Record<Owner, string> = { indi: '', auggie: '' };
async function call(
  owner: Owner,
  resource: string,
  method = 'GET',
  body?: unknown,
  cookie = cookies[owner],
) {
  if (
    resource === 'letters' &&
    method === 'POST' &&
    body &&
    typeof body === 'object' &&
    'body' in body &&
    !('artwork' in body)
  ) {
    const artwork = newLetterDocument();
    artwork.text.body.text = String(body.body);
    artwork.text.signature.text = 'Preview test';
    artwork.objects = [makeStamp('flower', 'preview-stamp')];
    body = { ...body, artwork };
  }
  return fetch(origin + '/api/' + owner + '/' + resource, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookie,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function snapshot(owner: Owner): Promise<MailboxSnapshot> {
  const response = await call(owner, 'letters');
  assert.equal(response.status, 200);
  return response.json() as Promise<MailboxSnapshot>;
}
void test('HTTP end-to-end: open access without cookies, both directions, read state, duplicate retry, persistence', async () => {
  for (const owner of ['indi', 'auggie'] as const) {
    const open = await call(owner, 'letters', 'GET', undefined, '');
    assert.equal(open.status, 200);
    assert.equal(open.headers.get('set-cookie'), null);
    const stale = await call(
      owner,
      'letters',
      'GET',
      undefined,
      'mailbox_indi=expired',
    );
    assert.equal(stale.status, 200);
  }
  const csrf = await fetch(origin + '/api/indi/letters', {
    method: 'POST',
    headers: {
      Cookie: cookies.indi,
      Origin: 'https://elsewhere.example',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(csrf.status, 403);
  for (const body of ['', 'x'.repeat(20001)]) {
    assert.equal(
      (
        await call('indi', 'letters', 'POST', {
          body,
          reply_to: null,
          client_id: crypto.randomUUID(),
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await call('indi', 'letters', 'POST', {
        sender: 'auggie',
        body: 'no spoofing',
        reply_to: null,
        client_id: crypto.randomUUID(),
      })
    ).status,
    400,
  );
  let current = await snapshot('indi');
  // Preserve all existing local letters; if needed, add one labelled setup reply so Indi can begin.
  if (current.latest?.sender === 'indi') {
    assert.equal(
      (await call('auggie', 'letters/read', 'POST', { id: current.latest.id }))
        .status,
      200,
    );
    assert.equal(
      (
        await call('auggie', 'letters', 'POST', {
          body: '[Preview test] Preparing a fresh exchange.',
          reply_to: current.latest.id,
          client_id: crypto.randomUUID(),
        })
      ).status,
      201,
    );
    current = await snapshot('indi');
  }
  if (current.latest)
    assert.equal(
      (await call('indi', 'letters/read', 'POST', { id: current.latest.id }))
        .status,
      200,
    );
  const payload = {
    body: '[Preview test] A letter from Indi.\n\nPlain text stays plain: <script>test</script>',
    reply_to: current.latest?.id ?? null,
    client_id: crypto.randomUUID(),
  };
  const sentArtwork = decorated(payload.body, 'indi');
  Object.assign(payload, { artwork: sentArtwork });
  const sentResponse = await call('indi', 'letters', 'POST', payload);
  assert.equal(sentResponse.status, 201);
  const sent = (await sentResponse.json()) as Letter;
  assert.equal(sent.sender, 'indi');
  assert.equal(sent.recipient, 'auggie');
  assert.deepEqual(sent.artwork, sentArtwork);
  const retry = await call('indi', 'letters', 'POST', payload);
  assert.equal(retry.status, 201);
  assert.equal(((await retry.json()) as Letter).id, sent.id);
  assert.equal(
    (
      await call('indi', 'letters', 'POST', {
        ...payload,
        client_id: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  assert.equal(
    (await call('indi', 'letters/read', 'POST', { id: sent.id })).status,
    404,
  );
  const incoming = await snapshot('auggie');
  assert.equal(incoming.latest?.body, payload.body);
  assert.deepEqual(incoming.latest?.artwork, sentArtwork);
  assert.equal(incoming.latest.read_at, null);
  assert.equal(
    (await call('auggie', 'letters/read', 'POST', { id: sent.id })).status,
    200,
  );
  const reopened = await snapshot('auggie');
  assert.ok(reopened.latest?.read_at);
  assert.equal(reopened.latest.body, payload.body);
  assert.deepEqual(reopened.latest.artwork, sentArtwork);
  const replyBody =
    '[Preview test] Auggie’s reply made it back to Indi.\n\nEvery decoration travels with it.';
  const replyArtwork = decorated(replyBody, 'auggie');
  const replyResponse = await call('auggie', 'letters', 'POST', {
    body: replyBody,
    artwork: replyArtwork,
    reply_to: sent.id,
    client_id: crypto.randomUUID(),
  });
  assert.equal(replyResponse.status, 201);
  const indi = await snapshot('indi');
  assert.deepEqual(indi.latest?.artwork, replyArtwork);
  assert.equal(indi.latest?.body, replyBody);
  assert.equal(indi.latest?.sender, 'auggie');
  assert.equal(indi.latest?.read_at, null);
  assert.equal((await snapshot('indi')).latest?.id, indi.latest?.id);
  assert.deepEqual((await snapshot('indi')).latest?.artwork, replyArtwork);
  assert.equal((await call('indi', 'auth', 'DELETE')).status, 200);
  assert.equal(
    (await call('indi', 'letters', 'GET', undefined, '')).status,
    200,
  );
  const sentList = await call('indi', 'letters?box=sent');
  assert.equal(sentList.status, 200);
  assert.equal(((await sentList.json()) as Letter[])[0].id, sent.id);
  assert.equal((await call('auggie', 'letters?box=inbox')).status, 200);
  const reply = (await replyResponse.json()) as Letter;
  assert.equal(
    (
      (await (
        await call('auggie', 'letters/' + reply.id, 'POST')
      ).json()) as Letter
    ).read_at,
    null,
  );
  assert.ok(
    (
      (await (
        await call('indi', 'letters/' + reply.id, 'POST')
      ).json()) as Letter
    ).read_at,
  );
  assert.equal(
    (await call('indi', 'letters/' + reply.id, 'DELETE')).status,
    200,
  );
  assert.equal((await call('indi', 'letters/' + reply.id, 'POST')).status, 404);
  assert.equal(
    (await call('auggie', 'letters/' + reply.id, 'POST')).status,
    200,
  );
  assert.equal(
    (await call('auggie', 'letters/' + reply.id, 'DELETE')).status,
    200,
  );
  assert.equal(
    (await call('auggie', 'letters/' + reply.id, 'POST')).status,
    404,
  );
  assert.equal((await call('indi', 'letters?box=unknown')).status, 400);
  assert.equal((await call('indi', 'letters?box=inbox&offset=-1')).status, 400);
  for (const resource of [
    'letters',
    'letters?box=inbox',
    'letters?box=sent',
    'letters/' + reply.id,
  ]) {
    assert.equal(
      (await fetch(origin + '/api/stranger/' + resource)).status,
      resource.includes(reply.id) ? 405 : 404,
    );
  }
  assert.equal(
    (
      await fetch(origin + '/api/stranger/letters/' + reply.id, {
        method: 'POST',
        headers: { Origin: origin },
      })
    ).status,
    404,
  );
  assert.equal(
    (await fetch(origin + '/api/indi/letters/' + sent.id, { method: 'DELETE' }))
      .status,
    403,
  );
  console.log(
    'Confirmed /indi → send → /auggie → receive → read → reply → /indi → receive without passwords or cookies.',
  );
});
