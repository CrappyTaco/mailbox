import { endpoint, parseBody, json, HttpError } from '@/lib/server/endpoint';
import { mailboxDatabase } from '@/lib/server/database';
import { letterSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  return endpoint(request, params, async (owner) => {
    const search = new URL(request.url).searchParams;
    const box = search.get('box');
    if (box !== null && box !== 'inbox' && box !== 'sent')
      throw new HttpError(400, 'Choose inbox or sent.');
    const offset = Number(search.get('offset') ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new HttpError(400, 'Invalid mailbox page.');
    const db = await mailboxDatabase();
    return json(
      box ? await db.list(owner, box, offset) : await db.snapshot(owner),
    );
  });
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  return endpoint(request, params, async (owner) => {
    const body = await parseBody(request, letterSchema, 2000000);
    return json(await (await mailboxDatabase()).send(owner, body), 201);
  });
}
