import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bodyBox,
  flowLines,
  paginateDocument,
  pageArtwork,
  mergePageArtwork,
  pageAtOffset,
} from '../lib/letter-pages';
import {
  newLetterDocument,
  makeStamp,
  clampObject,
  DocumentHistory,
  lineHeight,
} from '../lib/letter-document';
import { letterDocumentSchema } from '../lib/letter-art-schema';
import {
  deliveryFrame,
  ORBIT,
  DEPARTURE_SECONDS,
  FLIGHT_SECONDS,
} from '../lib/delivery';
const measure = (s: string) => Array.from(s).length * 12;
void test('live pagination preserves every character, explicit newline, long word and Unicode boundary', () => {
  for (const text of [
    'paragraph '.repeat(900),
    '\n'.repeat(99),
    '😀'.repeat(900) + '\n\nend',
    'x'.repeat(1000),
    'a  b\n\n' + 'end '.repeat(700),
  ]) {
    const doc = newLetterDocument('Indi');
    doc.text.body.text = text;
    const next = paginateDocument(doc, measure),
      pages = next.pages!;
    assert.ok(pages.length > 1);
    assert.equal(pages.map((p) => text.slice(p.start, p.end)).join(''), text);
    assert.equal(pages[0].start, 0);
    assert.equal(pages.at(-1)!.end, text.length);
    pages.forEach((p, i) => {
      assert.ok(!/[\uDC00-\uDFFF]/.test(text[p.start] ?? ''));
      const lines = flowLines(text.slice(p.start, p.end), 520, measure);
      const visible = lines.filter((l) => l.start !== l.end);
      assert.ok(
        visible.length <=
          Math.floor(bodyBox(i).height / lineHeight(doc.text.body)),
      );
      assert.equal(pageAtOffset(pages, p.start), i);
    });
    assert.ok(letterDocumentSchema.safeParse(next).success);
  }
});
void test('deleting text merges sheets but preserves decorated continuation sheets and local ink', () => {
  const doc = newLetterDocument('Indi');
  doc.text.body.text = 'Long letter. '.repeat(400);
  let next = paginateDocument(doc, measure);
  const last = next.pages!.length - 1;
  next.objects = [
    { ...makeStamp('earl', 'first'), page: 0 },
    { ...makeStamp('lady', 'last'), page: last, rotation: 270 },
  ];
  next.strokes = [
    {
      color: '#59434b',
      width: 4,
      points: [
        [50, 100],
        [80, 140],
      ],
      page: last,
    },
  ];
  next = paginateDocument(
    {
      ...next,
      text: { ...next.text, body: { ...next.text.body, text: 'Short now.' } },
    },
    measure,
  );
  assert.equal(next.pages!.length, last + 1);
  assert.equal(next.pages![last].start, 'Short now.'.length);
  assert.deepEqual(
    pageArtwork(next, 0).objects.map((o) => o.asset),
    ['earl'],
  );
  const sheet = pageArtwork(next, last);
  assert.equal(sheet.strokes.length, 1);
  assert.equal(sheet.objects[0].rotation, 270);
  const removed = mergePageArtwork(next, last, {
    ...sheet,
    objects: [],
    strokes: [],
  });
  assert.equal(paginateDocument(removed, measure).pages!.length, 1);
  assert.deepEqual(
    removed.objects.map((o) => o.asset),
    ['earl'],
  );
  const history = new DocumentHistory(next);
  history.change(removed);
  assert.deepEqual(history.undo(), next);
  assert.deepEqual(history.redo(), removed);
});
void test('page ranges and references reject gaps, lost text and orphaned decorations', () => {
  const doc = newLetterDocument();
  doc.text.body.text = 'Text';
  const next = paginateDocument(doc, measure);
  for (const pages of [
    undefined,
    [{ start: 1, end: 4 }],
    [{ start: 0, end: 2 }],
    [
      { start: 0, end: 2 },
      { start: 3, end: 4 },
    ],
  ])
    assert.equal(
      letterDocumentSchema.safeParse({ ...next, pages }).success,
      false,
    );
  assert.equal(
    letterDocumentSchema.safeParse({
      ...next,
      objects: [{ ...makeStamp('earl', 'a'), page: 2 }],
    }).success,
    false,
  );
});
void test('full revolutions preserve the center while edge rotations remain inside the sheet', () => {
  for (let rotation = -720; rotation <= 720; rotation += 3) {
    const object = clampObject({ ...makeStamp('toffee', 's'), rotation });
    assert.equal(object.x, 300);
    assert.equal(object.y, 380);
    assert.ok(object.rotation >= 0 && object.rotation < 360);
    const edge = clampObject({ ...object, x: 1, y: 759 });
    const doc = newLetterDocument();
    doc.objects = [edge];
    assert.ok(letterDocumentSchema.safeParse(doc).success);
  }
});
void test('delivery follows the globe at a constant radius and advances around its contour', () => {
  let previous: ReturnType<typeof deliveryFrame> | undefined;
  for (let t = DEPARTURE_SECONDS; t < FLIGHT_SECONDS; t += 0.05) {
    const p = deliveryFrame(t, null);
    assert.ok(
      Math.abs(Math.hypot(p.x - ORBIT.x, p.y - ORBIT.y) - ORBIT.radius) < 1e-8,
    );
    if (previous) {
      const cross =
        (previous.x - ORBIT.x) * (p.y - ORBIT.y) -
        (previous.y - ORBIT.y) * (p.x - ORBIT.x);
      assert.ok(
        cross <= 1e-8,
        'the orbit must keep turning in the same direction',
      );
      assert.ok(p.angle <= previous.angle);
    }
    previous = p;
  }
});
