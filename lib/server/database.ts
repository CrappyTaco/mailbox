import { getEnvironment } from './env';
export class DatabaseError extends Error {
  constructor(
    public code: string,
    public status?: number,
    public upstreamCode?: string,
  ) {
    super(code);
  }
}
export async function rpc<T>(
  name:
    | 'mailbox_snapshot'
    | 'send_letter'
    | 'read_letter'
    | 'take_auth_attempt',
  args: Record<string, unknown>,
): Promise<T> {
  const env = getEnvironment();
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(args),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const data =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const known = [
      'waiting_for_reply',
      'open_letter_first',
      'conversation_changed',
      'idempotency_conflict',
      'letter_not_found',
      'invalid_body',
    ];
    throw new DatabaseError(
      known.find(
        (code) =>
          typeof data.message === 'string' && data.message.includes(code),
      ) ?? 'database_unavailable',
      response.status,
      // Only retain PostgREST/SQLSTATE identifiers, never upstream messages,
      // request headers, URLs or response bodies (which may contain mail).
      typeof data.code === 'string' &&
        /^(?:PGRST\d{3}|[0-9A-Z]{5})$/.test(data.code)
        ? data.code
        : undefined,
    );
  }
  return response.json() as Promise<T>;
}
