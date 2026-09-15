import { mkdir, writeFile } from 'node:fs/promises';
import { localDatabase } from './d1-local.mjs';
const { db, dispose } = await localDatabase();
try {
  const [letters, world] = await db.batch([
    db.prepare('SELECT * FROM letters ORDER BY rowid'),
    db.prepare('SELECT * FROM mailbox_world'),
  ]);
  await mkdir('.local', { recursive: true });
  const file = '.local/d1-letters-export.json';
  await writeFile(
    file,
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        letters: letters.results,
        world: world.results,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    'Exported ' +
      letters.results.length +
      ' letters to ' +
      file +
      '. Keep this backup private.',
  );
} finally {
  await dispose();
}
