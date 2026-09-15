import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
if (process.env.LOCAL_PREVIEW !== 'true')
  throw new Error('Local preview must be explicitly enabled.');
await mkdir('.local', { recursive: true });
const qa = process.argv.includes('--qa');
const port = qa ? 55433 : 55432;
const db = new PGlite(qa ? '.local/qa-postgres' : '.local/postgres');
await db.exec(
  'do $$ begin create role anon; exception when duplicate_object then null; end $$; do $$ begin create role authenticated; exception when duplicate_object then null; end $$; do $$ begin create role service_role; exception when duplicate_object then null; end $$;',
);
await db.exec(
  'create table if not exists public.local_migrations(name text primary key)',
);
for (const migration of (await readdir('supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .sort()) {
  if (
    !(
      await db.query('select name from public.local_migrations where name=$1', [
        migration,
      ])
    ).rows.length
  ) {
    await db.transaction(async (tx) => {
      await tx.exec(await readFile('supabase/migrations/' + migration, 'utf8'));
      await tx.query('insert into public.local_migrations(name) values($1)', [
        migration,
      ]);
    });
  }
}
const methods = {
  mailbox_snapshot: ['p_owner'],
  send_letter: ['p_owner', 'p_body', 'p_reply_to', 'p_client_id', 'p_artwork'],
  read_letter: ['p_owner', 'p_id'],
  take_auth_attempt: ['p_key', 'p_limit', 'p_window'],
};
const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  const fail = (status, message) => {
    res.writeHead(status);
    res.end(JSON.stringify({ message }));
  };
  const received = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(
    'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    return fail(401, 'unauthorized');
  const name = req.url?.split('/rest/v1/rpc/')[1];
  if (req.method !== 'POST' || !Object.hasOwn(methods, name ?? ''))
    return fail(404, 'unknown_endpoint');
  try {
    let size = 0;
    const parts = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2200000) return fail(413, 'payload_too_large');
      parts.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(parts).toString());
    if (name === 'send_letter' && !('p_artwork' in body)) body.p_artwork = null;
    const keys = methods[name];
    if (keys.some((key) => !(key in body)))
      return fail(400, 'invalid_arguments');
    const placeholders = keys.map((_, i) => '$' + (i + 1)).join(',');
    const result = await db.query(
      'select public.' + name + '(' + placeholders + ') as result',
      keys.map((key) =>
        key === 'p_artwork' && body[key] !== null
          ? JSON.stringify(body[key])
          : body[key],
      ),
    );
    res.end(JSON.stringify(result.rows[0].result));
  } catch (error) {
    fail(400, error.message);
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `Persistent ${qa ? 'isolated QA' : 'local'} PostgreSQL ready at http://127.0.0.1:${port}`,
  ),
);
for (const event of ['SIGINT', 'SIGTERM'])
  process.on(event, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
