import {
  type LetterArt,
  type InkStroke,
  type StampId,
  hasSignature as hasDrawnSignature,
} from './letter-art';

export const fontIds = ['pixel', 'handwriting', 'typewriter', 'book'] as const;
export type FontId = (typeof fontIds)[number];
export const fontFamilies: Record<FontId, string> = {
  pixel: '"Pixelify"',
  handwriting: '"Caveat"',
  typewriter: '"Special Elite"',
  book: '"Lora"',
};
export const fontNames = ['Pixel', 'Handwriting', 'Typewriter', 'Storybook'];
export const textColors = [
  '#59434b',
  '#29272b',
  '#873e4b',
  '#3e6145',
  '#304763',
  '#735170',
  '#54799c',
  '#a75e79',
] as const;
export const textColorNames = [
  'Brown',
  'Black',
  'Dark red',
  'Forest',
  'Navy',
  'Purple',
  'Blue',
  'Pink',
];
export const fontSizes = [18, 22, 26, 30] as const;
export type TextFieldId = 'greeting' | 'body' | 'signature';
export interface TextField {
  text: string;
  font: FontId;
  size: number;
  color: (typeof textColors)[number];
}
export interface LetterObject {
  page?: number;
  id: string;
  type: 'stamp' | 'sticker';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  asset: string;
}
export interface LetterDocument {
  version: 2 | 3;
  pages?: { start: number; end: number }[];
  text: Record<TextFieldId, TextField>;
  objects: LetterObject[];
  strokes: InkStroke[];
}
export type SavedLetterArt = LetterArt | LetterDocument;
export const MAX_OBJECTS = 24;
export const MAX_STICKERS = 6;
export const MAX_STICKER_BYTES = 500000;
export const MAX_STICKER_TOTAL = 1800000;
export const fieldBoxes = {
  greeting: { x: 40, y: 67, width: 465, height: 80 },
  body: { x: 40, y: 167, width: 520, height: 395 },
  signature: { x: 40, y: 620, width: 470, height: 96 },
} as const;
export const lineHeight = (field: TextField) => field.size * 1.5;
export function newLetterDocument(recipient = ''): LetterDocument {
  const field = (text = '', size = 22): TextField => ({
    text,
    font: 'pixel',
    size,
    color: textColors[0],
  });
  return {
    version: 2,
    text: {
      greeting: field(recipient ? `Dear ${recipient},` : '', 26),
      body: field(),
      signature: field(),
    },
    objects: [],
    strokes: [],
  };
}
export function toDocument(
  art: SavedLetterArt | null | undefined,
  body: string,
  recipient: string,
): LetterDocument {
  if (art && art.version !== 1) return art;
  const doc = newLetterDocument(recipient);
  doc.text.body.text = body;
  if (art) {
    doc.strokes = art.strokes;
    if (art.stamp)
      doc.objects = [
        {
          id: 'legacy-stamp',
          type: 'stamp',
          asset: art.stamp.design,
          x: art.stamp.x,
          y: art.stamp.y,
          rotation: art.stamp.rotation,
          width: 72,
          height: 90,
        },
      ];
  }
  return doc;
}
export function isSigned(doc: LetterDocument) {
  return (
    !!doc.text.signature.text.trim() ||
    hasDrawnSignature({ version: 1, stamp: null, strokes: doc.strokes })
  );
}
export function hasPlacedStamp(doc: SavedLetterArt | null | undefined) {
  return doc && doc.version !== 1
    ? doc.objects.some((o) => o.type === 'stamp')
    : !!doc?.stamp;
}
export function clampObject(object: LetterObject): LetterObject {
  const rotation = ((object.rotation % 360) + 360) % 360;
  const angle = (rotation * Math.PI) / 180;
  const halfX =
    (Math.abs(Math.cos(angle)) * object.width +
      Math.abs(Math.sin(angle)) * object.height) /
      2 +
    2;
  const halfY =
    (Math.abs(Math.sin(angle)) * object.width +
      Math.abs(Math.cos(angle)) * object.height) /
      2 +
    2;
  return {
    ...object,
    rotation,
    x: Math.round(Math.max(halfX, Math.min(600 - halfX, object.x)) * 10) / 10,
    y: Math.round(Math.max(halfY, Math.min(760 - halfY, object.y)) * 10) / 10,
  };
}
export function makeStamp(asset: StampId, id: string): LetterObject {
  return {
    id,
    type: 'stamp',
    asset,
    x: 300,
    y: 380,
    width: 72,
    height: 90,
    rotation: -5,
  };
}
export function resizeSticker(
  object: LetterObject,
  factor: number,
): LetterObject {
  const longest = Math.max(object.width, object.height);
  const scale = Math.max(48, Math.min(240, longest * factor)) / longest;
  return clampObject({
    ...object,
    width: +(object.width * scale).toFixed(2),
    height: +(object.height * scale).toFixed(2),
  });
}
// A bounded, structurally shared history. One pointer gesture is one undo step.
export class DocumentHistory {
  past: LetterDocument[] = [];
  future: LetterDocument[] = [];
  private transaction: LetterDocument | null = null;
  constructor(public current: LetterDocument) {}
  begin() {
    if (!this.transaction) this.transaction = this.current;
  }
  change(next: LetterDocument) {
    if (next === this.current) return;
    if (!this.transaction) this.checkpoint(this.current);
    this.current = next;
  }
  private checkpoint(doc: LetterDocument) {
    this.past = [...this.past.slice(-39), doc];
    this.future = [];
  }
  end() {
    if (this.transaction && this.transaction !== this.current)
      this.checkpoint(this.transaction);
    this.transaction = null;
  }
  undo() {
    this.end();
    const next = this.past.pop();
    if (next) {
      this.future.push(this.current);
      this.current = next;
    }
    return this.current;
  }
  redo() {
    this.end();
    const next = this.future.pop();
    if (next) {
      this.past.push(this.current);
      this.current = next;
    }
    return this.current;
  }
  reset(next: LetterDocument) {
    this.current = next;
    this.past = [];
    this.future = [];
    this.transaction = null;
  }
}
