import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deliveryFrame,
  FLIGHT_SECONDS,
  solarCycle,
  globeShadow,
  RECEIVING_MOUTH,
  ORBIT,
  INSERT_SECONDS,
  CLOSE_SECONDS,
  RAISE_SECONDS,
} from '../lib/delivery';
import {
  mailboxPresentation,
  receivedLetter,
  getMailboxState,
  type Letter,
} from '../lib/mailbox-state';
import {
  hasPlacedStamp,
  makeStamp,
  newLetterDocument,
  resizeSticker,
  DocumentHistory,
} from '../lib/letter-document';
import { letterSchema } from '../lib/validation';
import { letterDocumentSchema, validSticker } from '../lib/letter-art-schema';
import { builtinStickers } from '../lib/builtin-stickers';
void test('mailbox progresses unread closed/up, read open/up, replied closed/down even with received history', () => {
  const letter: Letter = {
    id: 'in',
    sender: 'indi',
    recipient: 'auggie',
    body: 'hello',
    created_at: '2026-09-06',
    delivered_at: '2026-09-06',
    read_at: null,
    reply_to: null,
  };
  const base = {
    latest: letter,
    received: letter,
    last_incoming_at: null,
    established_at: '2026-09-06',
  };
  assert.deepEqual(mailboxPresentation(getMailboxState('auggie', base).state), {
    door: 'closed',
    flag: true,
    envelope: false,
  });
  const read = { ...letter, read_at: '2026-09-06' };
  const opened = { ...base, latest: read };
  assert.deepEqual(
    mailboxPresentation(getMailboxState('auggie', opened).state),
    { door: 'open', flag: true, envelope: true },
  );
  const replied = {
    ...opened,
    latest: { ...read, sender: 'auggie' as const, recipient: 'indi' as const },
  };
  assert.equal(receivedLetter('auggie', replied), null);
  assert.deepEqual(
    mailboxPresentation(getMailboxState('auggie', replied).state),
    { door: 'closed', flag: false, envelope: false },
  );
  assert.equal(replied.received.id, 'in');
});
void test('postage is required at the send boundary, including no artwork and stickers without a stamp', () => {
  const doc = newLetterDocument('Indi');
  doc.text.body.text = 'Hi';
  doc.text.signature.text = 'Auggie';
  const payload = {
    body: 'Hi',
    reply_to: null,
    client_id: crypto.randomUUID(),
  };
  assert.equal(letterSchema.safeParse(payload).success, false);
  assert.equal(hasPlacedStamp(doc), false);
  doc.objects = [
    {
      id: 'heart',
      type: 'sticker',
      asset: builtinStickers[0].asset,
      x: 300,
      y: 380,
      width: 96,
      height: 96,
      rotation: 0,
    },
  ];
  assert.equal(
    letterSchema.safeParse({ ...payload, artwork: doc }).success,
    false,
  );
  doc.objects.push(makeStamp('flower', 'stamp'));
  assert.equal(
    letterSchema.safeParse({ ...payload, artwork: doc }).success,
    true,
  );
});
void test('all built-in stickers are distinct bounded PNGs and survive document history', () => {
  assert.equal(builtinStickers.length, 10);
  assert.equal(new Set(builtinStickers.map((s) => s.asset)).size, 10);
  for (const sticker of builtinStickers) {
    assert.ok(validSticker(sticker.asset));
    const doc = newLetterDocument();
    doc.objects = [
      {
        ...makeStamp('flower', 'pixel'),
        type: 'sticker',
        asset: sticker.asset,
        width: 96,
        height: 96,
      },
    ];
    assert.ok(letterDocumentSchema.safeParse(doc).success);
    const history = new DocumentHistory(doc);
    history.change({ ...doc, objects: [] });
    assert.equal(history.undo().objects[0].asset, sticker.asset);
    assert.equal(history.redo().objects.length, 0);
  }
});
void test('stamp resizing preserves postage aspect ratio, validates and stays in bounds', () => {
  for (const factor of [0.01, 0.85, 1.15, 100]) {
    const stamp = resizeSticker(
      { ...makeStamp('flower', 's'), x: 40, y: 50 },
      factor,
    );
    assert.ok(Math.abs(stamp.width / stamp.height - 0.8) < 0.002);
    const doc = newLetterDocument();
    doc.objects = [stamp];
    assert.ok(letterDocumentSchema.safeParse(doc).success);
  }
});
void test('delivery path has no jumps and waits visibly for server confirmation before insertion', () => {
  let last = deliveryFrame(0, null);
  for (let t = 0.01; t < FLIGHT_SECONDS; t += 0.01) {
    const frame = deliveryFrame(t, null);
    assert.ok(Math.hypot(frame.x - last.x, frame.y - last.y) < 3);
    assert.equal(frame.closed, false);
    assert.equal(frame.flag, false);
    last = frame;
  }
  const waiting = deliveryFrame(30, null);
  assert.equal(waiting.phase, 'waiting');
  assert.deepEqual(
    [waiting.x, waiting.y],
    [ORBIT.exitX, RECEIVING_MOUTH.centerY],
  );
  assert.equal(deliveryFrame(30, 30).phase, 'inserting');
  assert.equal(deliveryFrame(30 + INSERT_SECONDS + 0.001, 30).phase, 'closing');
  assert.equal(deliveryFrame(30 + INSERT_SECONDS + 0.001, 30).flag, false);
  assert.equal(
    deliveryFrame(30 + INSERT_SECONDS + CLOSE_SECONDS + 0.001, 30).phase,
    'raising',
  );
  assert.equal(
    deliveryFrame(
      30 + INSERT_SECONDS + CLOSE_SECONDS + RAISE_SECONDS + 0.001,
      30,
    ).phase,
    'complete',
  );
});
void test('globe has opposing sun/moon and approximately equal lit/dark hemispheres at every hour', () => {
  assert.ok(solarCycle(12).y < -0.99);
  assert.ok(solarCycle(0).y > 0.99);
  assert.equal(globeShadow(0, -80, 12), 0);
  assert.equal(globeShadow(0, -80, 0), 0.53);
  for (let hour = 0; hour < 24; hour++) {
    let light = 0,
      dark = 0;
    for (let x = -95; x <= 95; x += 5)
      for (let y = -95; y <= 95; y += 5)
        if (x * x + y * y < 95 * 95) {
          if (globeShadow(x, y, hour) < 0.3) light++;
          else dark++;
        }
    assert.ok(Math.abs(light - dark) / (light + dark) < 0.08);
  }
});
