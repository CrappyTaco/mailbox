import { z } from 'zod';
import { stampIds, inkColors, hasSignature, pointCount } from './letter-art';
import {
  fontIds,
  fontSizes,
  textColors,
  isSigned,
  MAX_OBJECTS,
  MAX_STICKERS,
  MAX_STICKER_BYTES,
  MAX_STICKER_TOTAL,
} from './letter-document';
export const letterArtSchema = z
  .object({
    version: z.literal(1),
    stamp: z
      .object({
        design: z.enum(stampIds),
        x: z.number().min(54).max(546),
        y: z.number().min(58).max(702),
        rotation: z.number().min(-12).max(12),
      })
      .strict()
      .nullable(),
    strokes: z
      .array(
        z
          .object({
            color: z.enum(inkColors),
            page: z.number().int().min(0).max(1999).optional(),
            width: z.union([z.literal(2), z.literal(4), z.literal(7)]),
            points: z
              .array(
                z.tuple([
                  z.number().min(0).max(600),
                  z.number().min(0).max(760),
                ]),
              )
              .min(1)
              .max(1200),
          })
          .strict(),
      )
      .max(256),
  })
  .strict()
  .refine(
    (art) => pointCount(art.strokes) <= 12000,
    'Too many drawing points.',
  );
const signedLegacyArtSchema = letterArtSchema.refine(
  hasSignature,
  'Please hand-sign near the bottom of the paper.',
);
const textFieldSchema = z
  .object({
    text: z.string().max(20000),
    font: z.enum(fontIds),
    size: z.number().refine((n) => fontSizes.includes(n as 18)),
    color: z.enum(textColors),
  })
  .strict();
const objectSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9-]{1,64}$/),
    page: z.number().int().min(0).max(1999).optional(),
    type: z.enum(['stamp', 'sticker']),
    x: z.number().min(0).max(600),
    y: z.number().min(0).max(760),
    width: z.number().min(8).max(240),
    height: z.number().min(8).max(240),
    rotation: z.number().min(-360).max(360),
    asset: z.string().max(MAX_STICKER_BYTES),
  })
  .strict()
  .superRefine((o, ctx) => {
    const a = (o.rotation * Math.PI) / 180;
    const hx =
      (Math.abs(Math.cos(a)) * o.width + Math.abs(Math.sin(a)) * o.height) / 2;
    const hy =
      (Math.abs(Math.sin(a)) * o.width + Math.abs(Math.cos(a)) * o.height) / 2;
    if (o.x < hx || o.x > 600 - hx || o.y < hy || o.y > 760 - hy)
      ctx.addIssue({
        code: 'custom',
        message: 'Object must stay on the paper.',
      });
    if (o.type === 'stamp') {
      if (
        !stampIds.includes(o.asset as (typeof stampIds)[number]) ||
        Math.abs(o.width / o.height - 72 / 90) > 0.002 ||
        Math.max(o.width, o.height) < 48
      )
        ctx.addIssue({ code: 'custom', message: 'Unknown stamp.' });
    } else if (!validSticker(o.asset))
      ctx.addIssue({ code: 'custom', message: 'Use a processed PNG sticker.' });
  });
// Only bounded PNG images are allowed, never URLs, SVG markup or arbitrary data URIs.
export function validSticker(asset: string): boolean {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(asset))
    return false;
  try {
    const header = atob(asset.slice(22, 66));
    if (
      header.slice(0, 8) !== '\x89PNG\r\n\x1a\n' ||
      header.slice(12, 16) !== 'IHDR'
    )
      return false;
    const number = (i: number) =>
      header.charCodeAt(i) * 16777216 +
      (header.charCodeAt(i + 1) << 16) +
      (header.charCodeAt(i + 2) << 8) +
      header.charCodeAt(i + 3);
    return (
      number(16) > 0 && number(16) <= 560 && number(20) > 0 && number(20) <= 560
    );
  } catch {
    return false;
  }
}
export const letterDocumentSchema = z
  .object({
    version: z.union([z.literal(2), z.literal(3)]),
    pages: z
      .array(
        z
          .object({
            start: z.number().int().min(0).max(20000),
            end: z.number().int().min(0).max(20000),
          })
          .strict(),
      )
      .min(1)
      .max(2000)
      .optional(),
    text: z
      .object({
        greeting: textFieldSchema.extend({ text: z.string().max(240) }),
        body: textFieldSchema,
        signature: textFieldSchema.extend({ text: z.string().max(240) }),
      })
      .strict(),
    objects: z.array(objectSchema).max(MAX_OBJECTS),
    strokes: letterArtSchema.shape.strokes,
  })
  .strict()
  .superRefine((doc, ctx) => {
    if (doc.version === 3) {
      const pages = doc.pages;
      if (
        !pages ||
        pages[0].start !== 0 ||
        pages.at(-1)?.end !== doc.text.body.text.length ||
        pages.some(
          (p, i) => p.end < p.start || (i > 0 && p.start !== pages[i - 1].end),
        ) ||
        [...doc.objects, ...doc.strokes].some(
          (o) => (o.page ?? 0) >= pages.length,
        )
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Letter pages must cover all text and decorations in order.',
        });
    }
    const stickers = doc.objects.filter((o) => o.type === 'sticker');
    if (
      stickers.length > MAX_STICKERS ||
      stickers.reduce((n, o) => n + o.asset.length, 0) > MAX_STICKER_TOTAL
    )
      ctx.addIssue({
        code: 'custom',
        message: 'This letter has too many stickers.',
      });
    if (new Set(doc.objects.map((o) => o.id)).size !== doc.objects.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Each object needs a unique ID.',
      });
    if (pointCount(doc.strokes) > 12000)
      ctx.addIssue({ code: 'custom', message: 'Too many drawing points.' });
  });
export const savedLetterArtSchema = z.union([
  letterArtSchema,
  letterDocumentSchema,
]);
export const signedLetterArtSchema = z.union([
  signedLegacyArtSchema,
  letterDocumentSchema.refine(
    isSigned,
    'Type or draw your signature near the bottom of the paper.',
  ),
]);
