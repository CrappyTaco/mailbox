import { fieldBoxes, lineHeight, type LetterDocument } from './letter-document';
export type TextLine = { start: number; end: number; visibleEnd: number };
export function bodyBox(page: number) {
  return page === 0
    ? fieldBoxes.body
    : { x: 40, y: 67, width: 520, height: 495 };
}
// Character offsets retain every newline and space, including page boundaries.
export function flowLines(
  text: string,
  width: number,
  measure: (s: string) => number,
): TextLine[] {
  const lines: TextLine[] = [];
  let start = 0,
    i = 0,
    lastSpace = -1;
  while (i < text.length) {
    if (text[i] === '\n') {
      lines.push({ start, end: i + 1, visibleEnd: i });
      start = ++i;
      lastSpace = -1;
      continue;
    }
    const length = (text.codePointAt(i) ?? 0) > 0xffff ? 2 : 1;
    if (i > start && measure(text.slice(start, i + length)) > width) {
      const end = lastSpace >= start ? lastSpace + 1 : i;
      lines.push({ start, end, visibleEnd: end });
      start = end;
      i = end;
      lastSpace = -1;
      continue;
    }
    if (text[i] === ' ' || text[i] === '\t') lastSpace = i;
    i += length;
  }
  lines.push({ start, end: text.length, visibleEnd: text.length });
  return lines;
}
export function paginateDocument(
  doc: LetterDocument,
  measure: (s: string) => number,
): LetterDocument {
  const text = doc.text.body.text,
    lines = flowLines(text, 520, measure),
    pages: { start: number; end: number }[] = [];
  let row = 0,
    start = 0;
  while (row < lines.length) {
    const capacity = Math.max(
      1,
      Math.floor(bodyBox(pages.length).height / lineHeight(doc.text.body)),
    );
    const next = Math.min(lines.length, row + capacity),
      end = lines[next - 1].end;
    pages.push({ start, end });
    start = end;
    row = next;
  }
  const decorated = Math.max(
    0,
    ...doc.objects.map((o) => o.page ?? 0),
    ...doc.strokes.map((o) => o.page ?? 0),
  );
  while (pages.length <= decorated)
    pages.push({ start: text.length, end: text.length });
  return { ...doc, version: 3, pages };
}
export function pageAtOffset(
  pages: { start: number; end: number }[],
  offset: number,
) {
  const i = pages.findIndex((p, n) => offset < p.end || n === pages.length - 1);
  return Math.max(0, i);
}
export function pageArtwork(doc: LetterDocument, page: number): LetterDocument {
  return {
    ...doc,
    objects: doc.objects.filter((o) => (o.page ?? 0) === page),
    strokes: doc.strokes.filter((s) => (s.page ?? 0) === page),
  };
}
export function mergePageArtwork(
  doc: LetterDocument,
  page: number,
  changed: LetterDocument,
): LetterDocument {
  return {
    ...doc,
    objects: [
      ...doc.objects.filter((o) => (o.page ?? 0) !== page),
      ...changed.objects.map((o) => ({ ...o, page })),
    ],
    strokes: [
      ...doc.strokes.filter((s) => (s.page ?? 0) !== page),
      ...changed.strokes.map((s) => ({ ...s, page })),
    ],
  };
}
