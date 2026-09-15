import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { newLetterArt } from '../lib/letter-art';
import { newLetterDocument, makeStamp } from '../lib/letter-document';
import { paginateDocument } from '../lib/letter-pages';
import { testDatabase, migrate } from '../scripts/d1-test.mjs';
import { MailboxDatabase } from '../lib/server/database';
import type { Letter, MailboxSnapshot, Owner } from '../lib/mailbox-state';
import { importLetters } from '../scripts/import-letters.mjs';
let db: D1Database;
let runtime: Awaited<ReturnType<typeof testDatabase>>;
let mailbox: MailboxDatabase;
let directory: string;
before(async () => {
  await mkdir('.local', { recursive: true });
  directory = await mkdtemp('.local/test-d1-');
  runtime = await testDatabase(directory);
  db = runtime.db as unknown as D1Database;
  mailbox = new MailboxDatabase(db);
  await migrate(db);
});
after(async () => {
  await runtime.mf.dispose();
});
async function reopen() {
  await runtime.mf.dispose();
  runtime = await testDatabase(directory);
  db = runtime.db as unknown as D1Database;
  mailbox = new MailboxDatabase(db);
}
async function rpc<T>(fn: string, args: unknown[]): Promise<T> {
  const owner = args[0] as Owner;
  if (fn === 'mailbox_snapshot') return (await mailbox.snapshot(owner)) as T;
  if (fn === 'read_letter')
    return (await mailbox.open(owner, args[1] as string, true)) as T;
  if (fn === 'send_letter')
    return (await mailbox.send(owner, {
      body: args[1] as string,
      reply_to: args[2] as string | null,
      client_id: args[3] as string,
      artwork: typeof args[4] === 'string' ? JSON.parse(args[4]) : null,
    })) as T;
  throw new Error('Unknown test operation');
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
  await reopen();
  assert.equal(
    (await rpc<MailboxSnapshot>('mailbox_snapshot', ['indi'])).latest?.body,
    'A reply from Auggie.',
  );
  assert.equal(
    await db.prepare('SELECT count(*) AS n FROM letters').first('n'),
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
    db
      .prepare(
        "INSERT INTO letters(id,sender_id,recipient_id,body,client_id) VALUES(?, 'indi', 'indi', 'hello', ?)",
      )
      .bind(crypto.randomUUID(), crypto.randomUUID())
      .run(),
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
  await reopen();
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
  await reopen();
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
  await reopen();
  assert.deepEqual(
    (await rpc<MailboxSnapshot>('mailbox_snapshot', ['indi'])).received
      ?.artwork,
    doc,
  );
  assert.equal((await rpc<Letter>('send_letter', args)).id, sent.id);
});

async function isolated(t: { after: (fn: () => Promise<void>) => void }) {
  const runtime = await testDatabase();
  t.after(() => runtime.mf.dispose());
  await migrate(runtime.db);
  return {
    db: runtime.db as unknown as D1Database,
    box: new MailboxDatabase(runtime.db as unknown as D1Database),
  };
}
const payload = (reply_to: string | null = null) => ({
  body: "A letter with 'quotes'; DROP TABLE letters; --",
  reply_to,
  client_id: crypto.randomUUID(),
});
void test('inbox and sent are newest first, paginated, and do not mark letters read', async (t) => {
  const { box } = await isolated(t);
  const first = await box.send('indi', payload());
  assert.deepEqual(
    (await box.list('auggie', 'inbox')).map((l) => l.id),
    [first.id],
  );
  assert.deepEqual(await box.list('indi', 'inbox'), []);
  assert.deepEqual(await box.list('auggie', 'sent'), []);
  assert.equal((await box.list('indi', 'sent'))[0].read_at, null);
  assert.equal((await box.open('indi', first.id)).read_at, null);
  await box.open('auggie', first.id);
  const reply = await box.send('auggie', payload(first.id));
  await box.open('indi', reply.id);
  const next = await box.send('indi', payload(reply.id));
  assert.deepEqual(
    (await box.list('auggie', 'inbox')).map((l) => l.id),
    [next.id, first.id],
  );
  assert.deepEqual(
    (await box.list('indi', 'sent', 1)).map((l) => l.id),
    [first.id],
  );
});
void test('recipient and sender soft deletion preserve the other copy and both-deleted mail stays stored', async (t) => {
  const { box, db } = await isolated(t);
  const input = payload();
  const first = await box.send('indi', input);
  await box.delete('indi', first.id);
  assert.deepEqual(await box.list('indi', 'sent'), []);
  assert.equal((await box.snapshot('indi')).latest, null);
  assert.equal((await box.snapshot('indi')).waiting, true);
  await assert.rejects(() => box.open('indi', first.id), /letter_not_found/);
  await assert.rejects(() => box.send('indi', input), /letter_not_found/);
  assert.equal((await box.open('auggie', first.id)).id, first.id);
  await box.delete('auggie', first.id);
  await box.delete('auggie', first.id); // repeat is harmless
  assert.deepEqual(await box.list('auggie', 'inbox'), []);
  assert.equal((await box.snapshot('auggie')).received, null);
  await assert.rejects(
    () => box.open('auggie', first.id, true),
    /letter_not_found/,
  );
  assert.equal(
    await db.prepare('SELECT count(*) AS n FROM letters').first('n'),
    1,
  );
  const next = await box.send(
    'auggie',
    payload((await box.snapshot('auggie')).reply_to),
  );
  assert.equal(next.reply_to, first.id);
});
void test('deleting an unread incoming letter allows replying without resurrecting it', async (t) => {
  const { box } = await isolated(t);
  const first = await box.send('indi', payload());
  await box.delete('auggie', first.id);
  assert.equal((await box.open('indi', first.id)).read_at, null);
  const snapshot = await box.snapshot('auggie');
  assert.equal(snapshot.latest, null);
  assert.equal(snapshot.waiting, false);
  assert.equal(
    (await box.send('auggie', payload(snapshot.reply_to))).recipient,
    'indi',
  );
});
void test('invalid owners and unknown letter IDs cannot open, read, list, reply or delete', async (t) => {
  const { box } = await isolated(t);
  const first = await box.send('indi', payload());
  const stranger = 'stranger' as Owner;
  for (const action of [
    () => box.snapshot(stranger),
    () => box.list(stranger, 'inbox'),
    () => box.open(stranger, first.id),
    () => box.delete(stranger, first.id),
    () => box.send(stranger, payload(first.id)),
  ])
    await assert.rejects(action, /invalid_owner/);
  for (const action of [
    () => box.open('indi', crypto.randomUUID()),
    () => box.delete('indi', crypto.randomUUID()),
  ])
    await assert.rejects(action, /letter_not_found/);
  // Public access is intentional; these checks validate a mailbox, not a person.
});
void test('simultaneous first sends and simultaneous replies each produce only one letter', async (t) => {
  const { box, db } = await isolated(t);
  const results = await Promise.allSettled(
    (['indi', 'auggie'] as const).map((owner) => box.send(owner, payload())),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const first = (await box.snapshot('indi')).latest!;
  await box.open(first.recipient, first.id);
  const replies = await Promise.allSettled([
    box.send(first.recipient, payload(first.id)),
    box.send(first.recipient, payload(first.id)),
  ]);
  assert.equal(replies.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    await db.prepare('SELECT count(*) AS n FROM letters').first('n'),
    2,
  );
});
void test('concurrent identical retries store one record and changed content conflicts', async (t) => {
  const { box, db } = await isolated(t);
  const input = payload();
  const letters = await Promise.all([
    box.send('indi', input),
    box.send('indi', input),
  ]);
  assert.equal(letters[0].id, letters[1].id);
  await assert.rejects(
    () => box.send('indi', { ...input, body: 'Changed' }),
    /idempotency_conflict/,
  );
  assert.equal(
    await db.prepare('SELECT count(*) AS n FROM letters').first('n'),
    1,
  );
});
void test('backup import preserves every field and fails atomically for nonempty or invalid data', async (t) => {
  const { db, box } = await isolated(t);
  const at = '2026-09-01T12:34:56.789Z';
  const id = crypto.randomUUID();
  const art = newLetterArt();
  const saved = {
    id,
    sender: 'indi',
    recipient: 'auggie',
    body: 'Retained',
    created_at: at,
    delivered_at: at,
    read_at: null,
    reply_to: null,
    client_id: crypto.randomUUID(),
    artwork: art,
  };
  const backup = {
    letters: [saved],
    world: [{ latest_id: id, established_at: at }],
  };
  await assert.rejects(() =>
    importLetters(db, {
      ...backup,
      letters: [{ ...saved, recipient: 'invalid' }],
    }),
  );
  assert.equal(
    await db.prepare('SELECT count(*) AS n FROM letters').first('n'),
    0,
  );
  assert.equal(await importLetters(db, backup), 1);
  const snapshot = await box.snapshot('auggie');
  assert.equal(snapshot.established_at, at);
  assert.deepEqual(snapshot.latest, {
    id,
    sender: 'indi',
    recipient: 'auggie',
    body: 'Retained',
    created_at: at,
    delivered_at: at,
    read_at: null,
    reply_to: null,
    artwork: art,
  });
  await assert.rejects(() => importLetters(db, backup));
  // The turn triggers survive both successful and failed imports.
  await assert.rejects(
    () => box.send('indi', payload(id)),
    /waiting_for_reply/,
  );
  await box.open('auggie', id);
  assert.equal((await box.send('auggie', payload(id))).reply_to, id);
});
