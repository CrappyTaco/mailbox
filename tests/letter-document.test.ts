import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newLetterDocument,
  toDocument,
  makeStamp,
  clampObject,
  resizeSticker,
  DocumentHistory,
  isSigned,
  type LetterObject,
} from '../lib/letter-document';
import {
  letterDocumentSchema,
  signedLetterArtSchema,
  validSticker,
} from '../lib/letter-art-schema';
import { wrapText } from '../lib/letter-renderer';
import { letterSchema } from '../lib/validation';
import { newLetterArt } from '../lib/letter-art';
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
void test('typed signatures sign the letter without drawing; old artwork reconstructs intact', () => {
  const doc = newLetterDocument('Auggie');
  assert.equal(isSigned(doc), false);
  doc.text.signature.text = 'Indi';
  assert.equal(isSigned(doc), true);
  assert.ok(signedLetterArtSchema.safeParse(doc).success);
  const old = newLetterArt();
  old.strokes = [
    {
      color: '#59434b',
      width: 4,
      points: [
        [60, 640],
        [110, 650],
      ],
    },
  ];
  const converted = toDocument(old, 'Old letter.', 'Indi');
  assert.deepEqual(converted.strokes, old.strokes);
  assert.equal(converted.objects[0].asset, 'flower');
  assert.equal(converted.text.body.text, 'Old letter.');
  assert.equal(converted.text.signature.text, '');
});
void test('each stamp starts at center; rotated objects and resized stickers stay on paper', () => {
  const stamp = makeStamp('toffee', 'a');
  assert.equal(stamp.x, 300);
  assert.equal(stamp.y, 380);
  const sticker: LetterObject = {
    ...stamp,
    type: 'sticker',
    asset: png,
    width: 120,
    height: 60,
  };
  for (const rotation of [-12, 0, 12]) {
    const moved = clampObject({ ...sticker, x: -1000, y: 1000, rotation });
    const doc = newLetterDocument();
    doc.objects = [moved];
    assert.ok(letterDocumentSchema.safeParse(doc).success);
    const resized = resizeSticker(moved, 100);
    assert.equal(resized.width, 240);
    assert.equal(resized.width / resized.height, 2);
  }
});
void test('undo and redo restore an entire gesture, deletion, addition, and text styling', () => {
  const doc = newLetterDocument('Auggie'),
    h = new DocumentHistory(doc);
  const added = { ...doc, objects: [makeStamp('flower', 'a')] };
  h.change(added);
  h.begin();
  for (let x = 301; x <= 400; x++)
    h.change({ ...added, objects: [{ ...added.objects[0], x }] });
  h.end();
  assert.equal(h.past.length, 2);
  assert.equal(h.undo().objects[0].x, 300);
  assert.equal(h.redo().objects[0].x, 400);
  h.change({ ...h.current, objects: [] });
  assert.equal(h.undo().objects.length, 1);
  h.change({
    ...h.current,
    text: {
      ...h.current.text,
      signature: {
        ...h.current.text.signature,
        text: 'Indi',
        font: 'handwriting',
      },
    },
  });
  assert.equal(h.future.length, 0);
  assert.equal(h.undo().text.signature.text, '');
  assert.equal(h.redo().text.signature.font, 'handwriting');
  h.reset(doc);
  assert.equal(h.past.length, 0);
  assert.equal(h.future.length, 0);
});
void test('saved objects reject hostile images, duplicate IDs and mismatched body text', () => {
  const doc = newLetterDocument();
  doc.text.signature.text = 'I';
  doc.text.body.text = 'Hello';
  assert.ok(validSticker(png));
  for (const asset of [
    'https://example.com/photo.png',
    'data:image/svg+xml,<svg/>',
    'data:image/png;base64,AAAA',
  ])
    assert.equal(validSticker(asset), false);
  doc.objects = [makeStamp('flower', 'a'), makeStamp('clover', 'a')];
  assert.equal(letterDocumentSchema.safeParse(doc).success, false);
  doc.objects = [makeStamp('flower', 'valid')];
  assert.equal(
    letterSchema.safeParse({
      body: 'Different',
      client_id: crypto.randomUUID(),
      reply_to: null,
      artwork: doc,
    }).success,
    false,
  );
  assert.ok(
    letterSchema.safeParse({
      body: 'Hello',
      client_id: crypto.randomUUID(),
      reply_to: null,
      artwork: doc,
    }).success,
  );
});
void test('page text wrapping preserves long words and explicit newlines', () => {
  assert.deepEqual(
    wrapText('hello world', 5, (t) => t.length),
    ['hello', 'world'],
  );
  assert.deepEqual(
    wrapText('abcdefghij\n\nend', 4, (t) => t.length),
    ['abcd', 'efgh', 'ij', '', 'end'],
  );
});
