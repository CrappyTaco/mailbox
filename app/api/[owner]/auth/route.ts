import { endpoint, json } from '@/lib/server/endpoint';
export const dynamic = 'force-dynamic';
// Older open tabs can finish their auth request; mailbox access needs no code.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  return endpoint(request, params, async () => json({ ok: true }));
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  return endpoint(request, params, async () => json({ ok: true }));
}
