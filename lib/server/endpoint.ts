import { z } from 'zod';
import { ConfigurationError, getEnvironment } from './env';
import { ownerSchema } from '../validation';
import type { Owner } from '../mailbox-state';
import { DatabaseError } from './database';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...headers,
    },
  });
}
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 90000,
): Promise<T> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new HttpError(
      415,
      'This letter needs a different envelope. Please refresh.',
    );
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new HttpError(413, 'That letter is too long.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'The envelope is empty.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, 'That letter is too long.');
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return schema.parse(JSON.parse(new TextDecoder().decode(buffer)));
  } catch {
    throw new HttpError(
      400,
      'Please check your letter. Use 1–20,000 characters.',
    );
  }
}
export function protectOrigin(request: Request) {
  const env = getEnvironment();
  if (request.headers.get('origin') !== env.APP_ORIGIN)
    throw new HttpError(
      403,
      'This request came from a different world. Please refresh.',
    );
}
export async function endpoint(
  request: Request,
  params: Promise<{ owner: string }>,
  handler: (owner: Owner) => Promise<Response>,
) {
  try {
    const { owner: raw } = await params;
    const parsed = ownerSchema.safeParse(raw);
    if (!parsed.success) throw new HttpError(404, 'That world is not here.');
    if (request.method !== 'GET') protectOrigin(request);
    return await handler(parsed.data);
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof DatabaseError) {
      if (error.code === 'letter_not_found')
        return json({ error: 'That letter is not in your mailbox.' }, 404);
      if (['invalid_body', 'invalid_artwork'].includes(error.code))
        return json(
          {
            error:
              'Please shorten your letter or remove a large uploaded sticker.',
          },
          400,
        );
      if (
        [
          'waiting_for_reply',
          'open_letter_first',
          'conversation_changed',
          'idempotency_conflict',
        ].includes(error.code)
      )
        return json(
          {
            error:
              error.code === 'waiting_for_reply'
                ? 'Your last letter is still with them. Wait for their reply.'
                : 'Your mailbox has changed. Close this letter and open your mailbox again.',
          },
          409,
        );
    }
    // Diagnostics stay in Worker logs. Do not log raw exceptions, credentials,
    // request bodies or database messages, and keep the public error generic.
    console.error(
      'mailbox_database_failed',
      error instanceof ConfigurationError
        ? { code: error.code, variables: error.variables }
        : error instanceof DatabaseError
          ? {
              code: error.code,
              operation: error.operation,
            }
          : {
              code:
                error instanceof Error &&
                ['TimeoutError', 'AbortError'].includes(error.name)
                  ? 'database_timeout'
                  : 'database_request_failed',
            },
    );
    return json(
      {
        error:
          'Our worlds are having trouble connecting. Please try again shortly.',
      },
      503,
    );
  }
}
