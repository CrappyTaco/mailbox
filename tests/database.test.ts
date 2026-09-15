import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, mkdtemp } from 'node:fs/promises';
import { newLetterArt } from '../lib/letter-art';
import { newLetterDocument, makeStamp } from '../lib/letter-document';
import { paginateDocument } from '../lib/letter-pages';
import { PGlite } from '@electric-sql/pglite';
import type { Letter, MailboxSnapshot } from '../lib/mailbox-state';
let db: PGlite;
let directory: string;
before(async () => {
  await mkdir('.local', { recursive: true });
  directory = await mkdtemp('.local/test-postgres-');
  db = new PGlite(directory);
  await db.exec(
    'create role anon; create role authenticated; create role service_role;',
  );
  for (const migration of (await readdir('supabase/migrations'))
    .filter((n) => n.endsWith('.sql'))
    .sort())
    await db.exec(await readFile('supabase/migrations/' + migration, 'utf8'));
});
after(async () => {
  await db.close();
});
async function rpc<T>(fn: string, args: unknown[]): Promise<T> {
  const result = await db.query<{ result: T }>(
    'select public.' +
      fn +
      '(' +
      args.map((_, i) => '$' + (i + 1)).join(',') +
      ') as result',
    args,
  );
  return result.rows[0].result;
}
void test('permanent letters: first send, read, reply, retry, reopen database', async () => {
  const firstId = crypto.randomUUID();
  const empty = await rpc<MailboxSnapshot>('mailbox_snapshot', ['indi']);
  assert.equal(empty.latest, null);
  const first = await rpc<Letter>('send_letter', [
    'indi',
    'A letter from Indi.',
    null,
    firstId,
  ]);
  assert.equal(first.recipient, 'auggie');
  assert.equal(first.read_at, null);
  assert.equal(
    (
      await rpc<Letter>('send_letter', [
        'indi',
        'A letter from Indi.',
        null,
        firstId,
      ])
    ).id,
    first.id,
  );
  await assert.rejects(
    () =>
      rpc('send_letter', ['indi', 'Another.', first.id, crypto.randomUUID()]),
    /waiting_for_reply/,
  );
  await assert.rejects(
    () => rpc('read_letter', ['indi', first.id]),
    /letter_not_found/,
  );
  await assert.rejects(
    () =>
      rpc('send_letter', [
        'auggie',
        'Too soon.',
        first.id,
        crypto.randomUUID(),
      ]),
    /open_letter_first/,
  );
  const read = await rpc<Letter>('read_letter', ['auggie', first.id]);
  assert.ok(read.read_at);
  assert.equal(
    (await rpc<Letter>('read_letter', ['auggie', first.id])).read_at,
    read.read_at,
  );
  assert.equal(
    (await rpc<MailboxSnapshot>('mailbox_snapshot', ['auggie'])).latest?.body,
    'A letter from Indi.',
  );
  await assert.rejects(
    () =>
      rpc('send_letter', ['auggie', 'Stale reply.', null, crypto.randomUUID()]),
    /conversation_changed/,
  );
  const reply = await rpc<Letter>('send_letter', [
    'auggie',
    'A reply from Auggie.',
    first.id,
    crypto.randomUUID(),
  ]);
  assert.equal(reply.recipient, 'indi');
  assert.equal(reply.reply_to, first.id);
  await db.close();
  db = new PGlite(directory);
  assert.equal(
    (await rpc<MailboxSnapshot>('mailbox_snapshot', ['indi'])).latest?.body,
    'A reply from Auggie.',
  );
  assert.equal(
    (
      await db.query<{ count: number }>(
        'select count(*)::integer as count from public.letters',
      )
    ).rows[0].count,
    2,
  );
});
void test('database constraints reject invalid senders, blank and oversized bodies', async () => {
  for (const body of ['', ' '.repeat(10), 'x'.repeat(20001)])
    await assert.rejects(
      () => rpc('send_letter', ['indi', body, null, crypto.randomUUID()]),
      /invalid_body/,
    );
  await assert.rejects(
    () => rpc('send_letter', ['imposter', 'Hello.', null, crypto.randomUUID()]),
    /invalid_owner/,
  );
  await assert.rejects(() =>
    db.query(
      "insert into public.letters(sender,recipient,body,client_id) values('indi','indi','hello',$1)",
      [crypto.randomUUID()],
    ),
  );
});
void test('stamp and actual ink persist across reads, replies, reopen, and idempotent retries', async () => {
  const current = await rpc<MailboxSnapshot>('mailbox_snapshot', ['indi']);
  const previous = current.latest!;
  await rpc('read_letter', ['indi', previous.id]);
  const art = newLetterArt();
  art.stamp = { design: 'noddle', x: 90, y: 610, rotation: 9 };
  art.strokes = [
    {
      color: '#59434b',
      width: 4,
      points: [
        [70, 670],
        [90, 640],
        [110, 672],
      ],
    },
  ];
  const client = crypto.randomUUID();
  const args = [
    'indi',
    'Decorated letter.',
    previous.id,
    client,
    JSON.stringify(art),
  ];
  const sent = await rpc<Letter>('send_letter', args);
  assert.deepEqual(sent.artwork, art);
  assert.equal((await rpc<Letter>('send_letter', args)).id, sent.id);
  await assert.rejects(
    () =>
      rpc('send_letter', [
        ...args.slice(0, 4),
        JSON.stringify({ ...art, stamp: { ...art.stamp, design: 'flower' } }),
      ]),
    /idempotency_conflict/,
  );
  const read = await rpc<Letter>('read_letter', ['auggie', sent.id]);
  assert.deepEqual(read.artwork, art);
  await rpc('send_letter', ['auggie', 'Reply.', sent.id, crypto.randomUUID()]);
  await db.close();
  db = new PGlite(directory);
  const reopened = await rpc<MailboxSnapshot>('mailbox_snapshot', ['auggie']);
  assert.equal(reopened.received?.id, sent.id);
  assert.deepEqual(reopened.received?.artwork, art);
  assert.equal(reopened.latest?.sender, 'auggie');
});
void test('version 2 styled text, multiple stamps and uploaded stickers survive sending and reopening', async () => {
  const snapshot = await rpc<MailboxSnapshot>('mailbox_snapshot', ['indi']);
  await rpc('read_letter', ['indi', snapshot.latest!.id]);
  const doc = newLetterDocument('Auggie');
  doc.text.body = {
    text: 'A styled letter.',
    font: 'typewriter',
    size: 18,
    color: '#304763',
  };
  doc.text.signature = {
    text: 'Indi',
    font: 'handwriting',
    size: 30,
    color: '#873e4b',
  };
  doc.objects = [
    makeStamp('flower', 'one'),
    makeStamp('noddle', 'two'),
    {
      id: 'three',
      type: 'sticker',
      asset:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
      x: 400,
      y: 550,
      width: 120,
      height: 120,
      rotation: 6,
    },
  ];
  const args = [
    'indi',
    doc.text.body.text,
    snapshot.latest!.id,
    crypto.randomUUID(),
    JSON.stringify(doc),
  ];
  const sent = await rpc<Letter>('send_letter', args);
  assert.deepEqual(sent.artwork, doc);
  assert.equal((await rpc<Letter>('send_letter', args)).id, sent.id);
  await assert.rejects(
    () =>
      rpc('send_letter', [
        ...args.slice(0, 4),
        JSON.stringify({ ...doc, objects: doc.objects.slice(1) }),
      ]),
    /idempotency_conflict/,
  );
  await rpc('read_letter', ['auggie', sent.id]);
  await db.close();
  db = new PGlite(directory);
  assert.deepEqual(
    (await rpc<MailboxSnapshot>('mailbox_snapshot', ['auggie'])).received
      ?.artwork,
    doc,
  );
});
void test('version 3 text ranges and page-local ink and rotated objects survive database restart', async () => {
  const snapshot = await rpc<MailboxSnapshot>('mailbox_snapshot', ['auggie']);
  await rpc('read_letter', ['auggie', snapshot.latest!.id]);
  let doc = newLetterDocument('Indi');
  doc.text.body.text = 'A page of words. '.repeat(150);
  doc.text.signature.text = 'Auggie';
  doc.objects = [
    { ...makeStamp('toffee', 'first-page'), page: 0 },
    { ...makeStamp('lady', 'third-page'), page: 2, rotation: 273 },
  ];
  doc.strokes = [
    {
      page: 1,
      color: '#59434b',
      width: 4,
      points: [
        [70, 400],
        [120, 420],
      ],
    },
  ];
  doc = paginateDocument(doc, (s) => s.length * 12);
  const args = [
    'auggie',
    doc.text.body.text,
    snapshot.latest!.id,
    crypto.randomUUID(),
    JSON.stringify(doc),
  ];
  const sent = await rpc<Letter>('send_letter', args);
  assert.deepEqual(sent.artwork, doc);
  await rpc('read_letter', ['indi', sent.id]);
  await db.close();
  db = new PGlite(directory);
  assert.deepEqual(
    (await rpc<MailboxSnapshot>('mailbox_snapshot', ['indi'])).received
      ?.artwork,
    doc,
  );
  assert.equal((await rpc<Letter>('send_letter', args)).id, sent.id);
});
void test('browser database roles cannot read tables or execute privileged functions', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec('set role ' + role);
    await assert.rejects(
      () => db.query('select * from public.letters'),
      /permission denied/,
    );
    await assert.rejects(
      () => rpc('mailbox_snapshot', ['indi']),
      /permission denied/,
    );
    await db.exec('reset role');
  }
});
void test('rate limits persist and enforce attempts atomically', async () => {
  assert.equal(await rpc('take_auth_attempt', ['test-ip', 2, 900]), true);
  assert.equal(await rpc('take_auth_attempt', ['test-ip', 2, 900]), true);
  assert.equal(await rpc('take_auth_attempt', ['test-ip', 2, 900]), false);
});
void test('simultaneous first sends can produce only one letter', async () => {
  const isolated = new PGlite();
  await isolated.exec(
    'create role anon;create role authenticated;create role service_role;',
  );
  await isolated.exec(
    await readFile('supabase/migrations/202609050001_mailbox.sql', 'utf8'),
  );
  const results = await Promise.allSettled(
    ['indi', 'auggie'].map((owner) =>
      isolated.query("select public.send_letter($1,'first',null,$2)", [
        owner,
        crypto.randomUUID(),
      ]),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(
    (
      await isolated.query<{ count: number }>(
        'select count(*)::integer as count from public.letters',
      )
    ).rows[0].count,
    1,
  );
  await isolated.close();
});
