import { endpoint, HttpError, json } from '@/lib/server/endpoint';
import { mailboxDatabase } from '@/lib/server/database';
import { readSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ owner: string; id: string }> };
async function letterId(params: Context['params']) {
  const { id } = await params;
  if (!readSchema.safeParse({ id }).success)
    throw new HttpError(404, 'That letter is not here.');
  return id;
}
// Opening changes read state, so use POST with the existing Origin protection.
export async function POST(request: Request, { params }: Context) {
  return endpoint(request, params, async (owner) =>
    json(await (await mailboxDatabase()).open(owner, await letterId(params))),
  );
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(request, params, async (owner) => {
    await (await mailboxDatabase()).delete(owner, await letterId(params));
    return json({ ok: true });
  });
}
