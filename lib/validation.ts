import { z } from 'zod';
import { signedLetterArtSchema } from './letter-art-schema';
import { hasPlacedStamp } from './letter-document';
export const ownerSchema = z.enum(['indi', 'auggie']);
export const letterSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, 'Your letter is still blank.')
      .max(20000, 'Please keep your letter under 20,000 characters.'),
    reply_to: z.uuid().nullable(),
    client_id: z.uuid(),
    artwork: signedLetterArtSchema.refine(
      hasPlacedStamp,
      'Place a postage stamp on your letter before sending.',
    ),
  })
  .strict()
  .refine(
    (value) =>
      value.artwork?.version === 1 ||
      value.artwork.text.body.text.trim() === value.body,
    'The letter text and artwork must match.',
  );
export const passcodeSchema = z
  .object({ passcode: z.string().min(1).max(256) })
  .strict();
export const readSchema = z.object({ id: z.uuid() }).strict();
