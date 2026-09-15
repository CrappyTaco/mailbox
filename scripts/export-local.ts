import { PGlite } from '@electric-sql/pglite';
import { writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
if (process.env.LOCAL_PREVIEW !== 'true')
  throw new Error('This script reads only the local preview.');
const db = new PGlite('.local/postgres');
const letters = (
  await db.query('select * from public.letters order by created_at,id')
).rows;
const world = (await db.query('select * from public.mailbox_world')).rows;
const file = '.local/letters-export.json';
await writeFile(
  file,
  JSON.stringify(
    { exported_at: new Date().toISOString(), letters, world },
    null,
    2,
  ),
  { mode: 0o600 },
);
await db.close();
console.log(
  'Exported ' +
    letters.length +
    ' letters to ' +
    file +
    '. Treat this file as private.',
);
