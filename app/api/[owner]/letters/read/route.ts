import { endpoint, parseBody, json } from '@/lib/server/endpoint';
import { mailboxDatabase } from '@/lib/server/database';
import { readSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  return endpoint(request, params, async (owner) => {
    const { id } = await parseBody(request, readSchema);
    return json(await (await mailboxDatabase()).open(owner, id, true));
  });
}
