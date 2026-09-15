import { PGlite } from '@electric-sql/pglite';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
if (process.env.LOCAL_PREVIEW !== 'true')
  throw new Error('Aging fixtures are local-preview-only.');
const days = Number(process.argv[2]);
if (!Number.isInteger(days) || days < 0 || days > 365)
  throw new Error(
    'Use an integer age in days, e.g. pnpm aging 8. Stop the database first.',
  );
const db = new PGlite('.local/postgres');
const at = new Date(Date.now() - days * 86400000).toISOString();
await db.transaction(async (tx) => {
  await tx.query('update public.mailbox_world set established_at=$1', [at]);
  await tx.query('update public.letters set created_at=$1,delivered_at=$1', [
    at,
  ]);
});
await db.close();
console.log(
  'Local mailbox timestamps set to ' +
    days +
    ' days ago. Start the preview and open any unread letter to see aging.',
);
