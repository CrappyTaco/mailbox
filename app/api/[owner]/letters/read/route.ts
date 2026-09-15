import { endpoint, parseBody, json } from '@/lib/server/endpoint';
import { rpc } from '@/lib/server/database';
import { readSchema } from '@/lib/validation';
import type { Letter } from '@/lib/mailbox-state';
export const dynamic = 'force-dynamic';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  return endpoint(request, params, async (owner) => {
    const { id } = await parseBody(request, readSchema);
    return json(await rpc<Letter>('read_letter', { p_owner: owner, p_id: id }));
  });
}
