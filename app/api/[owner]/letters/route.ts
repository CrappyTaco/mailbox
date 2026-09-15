import { endpoint, parseBody, json } from '@/lib/server/endpoint';
import { rpc } from '@/lib/server/database';
import { letterSchema } from '@/lib/validation';
import type { MailboxSnapshot, Letter } from '@/lib/mailbox-state';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  return endpoint(request, params, async (owner) =>
    json(await rpc<MailboxSnapshot>('mailbox_snapshot', { p_owner: owner })),
  );
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  return endpoint(request, params, async (owner) => {
    const body = await parseBody(request, letterSchema, 2200000);
    return json(
      await rpc<Letter>('send_letter', {
        p_owner: owner,
        p_body: body.body,
        p_reply_to: body.reply_to,
        p_client_id: body.client_id,
        p_artwork: body.artwork ?? null,
      }),
      201,
    );
  });
}
