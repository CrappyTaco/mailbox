import { paginateDocument, bodyBox, flowLines } from './letter-pages';
import {
  fieldBoxes,
  fontFamilies,
  fontIds,
  lineHeight,
  type LetterDocument,
  type TextField,
} from './letter-document';
import { builtinStickers } from './builtin-stickers';
import { WORLD_STYLE } from './world-style';
const pixelStickerAssets = new Set<string>(builtinStickers.map((s) => s.asset));

export const PAPER_COLOR = WORLD_STYLE.paper;
export async function loadLetterFonts() {
  await Promise.all(
    fontIds.map((id) => document.fonts.load(`22px ${fontFamilies[id]}`)),
  );
  await document.fonts.ready;
}
export const canvasFont = (field: TextField) =>
  `${field.size}px ${fontFamilies[field.font]}`;
// Preserve explicit newlines and wrap very long words without dropping any characters.
export function wrapText(
  text: string,
  width: number,
  measure: (text: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const token of paragraph.match(/\S+\s*|\s+/g) ?? []) {
      if (line && measure(line + token.trimEnd()) > width) {
        lines.push(line.trimEnd());
        line = '';
      }
      for (const char of token) {
        if (line && measure(line + char) > width) {
          lines.push(line.trimEnd());
          line = '';
        }
        if (line || char.trim()) line += char;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
export function textLines(
  ctx: CanvasRenderingContext2D,
  field: TextField,
  width: number,
) {
  ctx.font = canvasFont(field);
  return wrapText(field.text, width, (text) => ctx.measureText(text).width);
}
export function pagedDocument(
  ctx: CanvasRenderingContext2D,
  doc: LetterDocument,
) {
  ctx.font = canvasFont(doc.text.body);
  return doc.version === 3 && doc.pages
    ? doc
    : paginateDocument(doc, (s) => ctx.measureText(s).width);
}
export function pageCount(ctx: CanvasRenderingContext2D, doc: LetterDocument) {
  return pagedDocument(ctx, doc).pages!.length;
}
export function paintPaper(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, 600, 760);
  ctx.strokeStyle = WORLD_STYLE.paperShade;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 596, 756);
  // Flat paper and one clean fold, shared by the editor, reader and PDF.
  ctx.fillStyle = '#d1b59840';
  ctx.fillRect(298, 4, 2, 752);
}
export function paintText(
  ctx: CanvasRenderingContext2D,
  field: TextField,
  box: { x: number; y: number; width: number; height: number },
  lines?: string[],
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.font = canvasFont(field);
  ctx.fillStyle = field.color;
  ctx.textBaseline = 'alphabetic';
  const actualLines = lines ?? textLines(ctx, field, box.width);
  // Shared metrics leave room for both cursive ascenders and descenders.
  actualLines.forEach((line, i) =>
    ctx.fillText(
      line,
      box.x,
      box.y + field.size * 1.08 + i * lineHeight(field),
    ),
  );
  ctx.restore();
}
function imageFor(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error('A letter decoration could not be loaded. Please try again.'),
      );
    image.src = src;
  });
}
export async function letterAssets(doc: LetterDocument) {
  return new Map(
    await Promise.all(
      doc.objects.map(
        async (object) =>
          [
            object.id,
            await imageFor(
              object.type === 'stamp'
                ? `/stamps/${object.asset}.png`
                : object.asset,
            ),
          ] as const,
      ),
    ),
  );
}
export function paintLetter(
  ctx: CanvasRenderingContext2D,
  doc: LetterDocument,
  assets: Map<string, HTMLImageElement>,
  page = 0,
  decorationOnly = false,
) {
  paintPaper(ctx);
  const paged = pagedDocument(ctx, doc),
    count = paged.pages!.length;
  const range = paged.pages![Math.min(page, count - 1)];
  if (!decorationOnly) {
    if (page === 0) paintText(ctx, doc.text.greeting, fieldBoxes.greeting);
    const text = doc.text.body.text.slice(range.start, range.end),
      box = bodyBox(page);
    ctx.font = canvasFont(doc.text.body);
    const lines = flowLines(
      text,
      box.width,
      (s) => ctx.measureText(s).width,
    ).map((l) => text.slice(l.start, l.visibleEnd));
    paintText(ctx, doc.text.body, box, lines);
    if (page === count - 1)
      paintText(ctx, doc.text.signature, fieldBoxes.signature);
  }
  if (!decorationOnly) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of doc.strokes.filter((s) => (s.page ?? 0) === page)) {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      stroke.points.forEach(([x, y], i) => {
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      if (stroke.points.length === 1)
        ctx.lineTo(stroke.points[0][0] + 0.01, stroke.points[0][1]);
      ctx.stroke();
    }
    for (const object of doc.objects.filter((o) => (o.page ?? 0) === page)) {
      const image = assets.get(object.id);
      if (!image) continue;
      ctx.save();
      ctx.translate(object.x, object.y);
      ctx.rotate((object.rotation * Math.PI) / 180);
      ctx.imageSmoothingEnabled =
        object.type !== 'stamp' && !pixelStickerAssets.has(object.asset);
      ctx.imageSmoothingQuality = 'high';
      if (object.type === 'sticker') {
        ctx.shadowColor = '#795c5140';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 0;
      }
      ctx.drawImage(
        image,
        -object.width / 2,
        -object.height / 2,
        object.width,
        object.height,
      );
      ctx.restore();
    }
  }
  return count;
}
export async function renderLetterCanvas(
  doc: LetterDocument,
  page = 0,
  scale = 2,
) {
  await loadLetterFonts();
  const assets = await letterAssets(doc);
  const canvas = document.createElement('canvas');
  canvas.width = 600 * scale;
  canvas.height = 760 * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  const pages = paintLetter(ctx, doc, assets, page);
  const paged = pagedDocument(ctx, doc),
    range = paged.pages![Math.min(page, pages - 1)];
  const text = {
    greeting: page === 0 ? doc.text.greeting.text : '',
    body: doc.text.body.text.slice(range.start, range.end),
    signature: page === pages - 1 ? doc.text.signature.text : '',
  };
  return { canvas, pages, text };
}
export async function letterPDF(doc: LetterDocument) {
  await loadLetterFonts();
  const [{ jsPDF }, assets] = await Promise.all([
    import('jspdf'),
    letterAssets(doc),
  ]);
  const pdf = new jsPDF({ unit: 'pt', format: [600, 760], compress: true });
  pdf.setProperties({
    title: 'Our Mailbox — a letter',
    creator: 'Our Mailbox',
  });
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1520;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  const pages = pageCount(ctx, doc);
  for (let page = 0; page < pages; page++) {
    if (page) pdf.addPage([600, 760]);
    paintLetter(ctx, doc, assets, page);
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      600,
      760,
      undefined,
      'FAST',
    );
  }
  return pdf.output('blob');
}
