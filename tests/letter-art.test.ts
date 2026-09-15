import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mailbox } from '../components/mailbox/Mailbox';
import { receivedLetter, type Letter } from '../lib/mailbox-state';
import {
  clampStamp,
  eraseInk,
  hasSignature,
  newLetterArt,
  emptyArt,
  stampIds,
  inkColors,
  type InkStroke,
} from '../lib/letter-art';
import {
  letterArtSchema,
  signedLetterArtSchema,
} from '../lib/letter-art-schema';
const ink: InkStroke = {
  color: inkColors[0],
  width: 4,
  points: [
    [30, 100],
    [300, 100],
  ],
};
void test('ten stamp designs share the same constrained paper placement', () => {
  assert.equal(stampIds.length, 10);
  for (const design of stampIds)
    for (const rotation of [-12, 0, 12]) {
      const s = clampStamp({ design, x: -100, y: 999, rotation });
      assert.equal(s.x, 54);
      assert.equal(s.y, 702);
      const angle = (rotation * Math.PI) / 180;
      const halfX =
        Math.abs(36 * Math.cos(angle)) + Math.abs(45 * Math.sin(angle));
      const halfY =
        Math.abs(36 * Math.sin(angle)) + Math.abs(45 * Math.cos(angle));
      assert.ok(s.x - halfX >= 0 && s.y + halfY <= 760);
    }
});
void test('eraser cuts a sparse stroke in two and preserves original ink outside its path', () => {
  const erased = eraseInk([ink], [150, 80], [150, 120], 8);
  assert.equal(erased.length, 2);
  assert.deepEqual(erased[0].points[0], ink.points[0]);
  assert.deepEqual(erased[1].points.at(-1), ink.points.at(-1));
  for (const s of erased)
    for (const p of s.points) assert.ok(Math.abs(p[0] - 150) > 10);
  assert.deepEqual(ink.points, [
    [30, 100],
    [300, 100],
  ]);
});
void test('erasing deletes actual strokes and never paints an opaque paper patch', () => {
  assert.deepEqual(
    eraseInk(
      [
        {
          ...ink,
          points: [
            [100, 100],
            [110, 100],
          ],
        },
      ],
      [90, 100],
      [120, 100],
      12,
    ),
    [],
  );
});
void test('a signature requires drawn line length in the signing area, not a stamp, dot, or doodle elsewhere', () => {
  const art = newLetterArt();
  assert.equal(hasSignature(art), false);
  art.strokes = [ink];
  assert.equal(hasSignature(art), false);
  art.strokes = [{ ...ink, points: [[100, 660]] }];
  assert.equal(hasSignature(art), false);
  art.strokes = [
    {
      ...ink,
      points: [
        [100, 680],
        [120, 645],
        [140, 680],
      ],
    },
  ];
  assert.equal(hasSignature(art), true);
  art.strokes = eraseInk(art.strokes, [80, 660], [160, 660], 50);
  assert.equal(hasSignature(art), false);
});
void test('art validation rejects external assets, injected fields, invalid colors and out-of-bounds coordinates', () => {
  assert.ok(letterArtSchema.safeParse(emptyArt()).success);
  assert.ok(!signedLetterArtSchema.safeParse(newLetterArt()).success);
  for (const patch of [
    { stamp: { design: 'https://evil.test', x: 90, y: 90, rotation: 0 } },
    { script: 'alert(1)' },
    { strokes: [{ ...ink, color: 'url(https://evil.test)' }] },
    { strokes: [{ ...ink, points: [[Infinity, 10]] }] },
    { strokes: [{ ...ink, width: 1000 }] },
  ])
    assert.ok(
      !letterArtSchema.safeParse({ ...newLetterArt(), ...patch }).success,
    );
});
void test('read mail remains available until a reply becomes the latest letter', () => {
  const letter: Letter = {
    id: 'test',
    sender: 'indi',
    recipient: 'auggie',
    body: 'Hello',
    created_at: '2026-09-06',
    delivered_at: '2026-09-06',
    read_at: null,
    reply_to: null,
  };
  for (const read_at of [null, '2026-09-06']) {
    const incoming = { ...letter, read_at };
    const box = {
      latest: incoming,
      received: incoming,
      last_incoming_at: null,
      established_at: '2026-09-06',
    };
    assert.equal(receivedLetter('auggie', box)?.id, 'test');
    const html = renderToStaticMarkup(
      createElement(Mailbox, {
        mail: !!receivedLetter('auggie', box),
        ajar: true,
      }),
    );
    assert.ok(html.includes('flag-up'));
    assert.ok(html.includes('mailbox-letter'));
    assert.ok(html.includes('door-open'));
    assert.equal(
      receivedLetter('auggie', {
        ...box,
        latest: { ...letter, sender: 'auggie', recipient: 'indi' },
      }),
      null,
    );
  }
});
