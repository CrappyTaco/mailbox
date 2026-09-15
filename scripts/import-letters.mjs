// Offline JSON backup import. This script can access only Wrangler's local D1.
import { readFile } from 'node:fs/promises';
import { readD1Migrations } from './d1-migrations.mjs';
import { localDatabase } from './d1-local.mjs';
export async function importLetters(db, backup) {
  if (
    !Array.isArray(backup.letters) ||
    !Array.isArray(backup.world) ||
    backup.world.length !== 1
  )
    throw new Error('Expected a backup with letters and one world row.');
  const letters = backup.letters;
  const rows = letters.map((l) => ({
    ...l,
    sender_id: l.sender_id ?? l.sender,
    recipient_id: l.recipient_id ?? l.recipient,
    artwork:
      typeof l.artwork === 'string'
        ? l.artwork
        : l.artwork
          ? JSON.stringify(l.artwork)
          : null,
    deleted_by_sender: l.deleted_by_sender ?? 0,
    deleted_by_recipient: l.deleted_by_recipient ?? 0,
  }));
  const migrations = await readD1Migrations('migrations');
  const triggers = migrations
    .flatMap((m) => m.queries)
    .filter((sql) => /CREATE TRIGGER/i.test(sql));
  // All import statements, including temporary trigger removal, share one atomic
  // D1 batch. Refuse a nonempty destination; never replace an existing mailbox.
  await db.batch([
    db.prepare('CREATE TABLE import_guard (n INTEGER CHECK (n = 0))'),
    db.prepare('INSERT INTO import_guard SELECT count(*) FROM letters'),
    db.prepare('DROP TABLE import_guard'),
    db.prepare('PRAGMA defer_foreign_keys = ON'),
    db.prepare('DROP TRIGGER letters_validate_turn'),
    db.prepare('DROP TRIGGER letters_advance_turn'),
    ...rows.map((l) =>
      db
        .prepare(`INSERT INTO letters
      (id,sender_id,recipient_id,subject,body,created_at,delivered_at,read_at,reply_to,client_id,artwork,deleted_by_sender,deleted_by_recipient)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(
          l.id,
          l.sender_id,
          l.recipient_id,
          l.subject ?? null,
          l.body,
          l.created_at,
          l.delivered_at,
          l.read_at,
          l.reply_to,
          l.client_id,
          l.artwork,
          l.deleted_by_sender,
          l.deleted_by_recipient,
        ),
    ),
    db
      .prepare(
        'UPDATE mailbox_world SET latest_id = ?, established_at = ? WHERE singleton = 1',
      )
      .bind(backup.world[0].latest_id, backup.world[0].established_at),
    ...triggers.map((sql) => db.prepare(sql)),
  ]);
  const count = await db
    .prepare('SELECT count(*) AS n FROM letters')
    .first('n');
  if (count !== rows.length) throw new Error('Import row count did not match.');
  return count;
}
if (
  process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith('/scripts/import-letters.mjs') ||
  process.argv[1] === 'scripts/import-letters.mjs'
) {
  const file = process.argv[2];
  if (!file || process.argv.includes('--remote'))
    throw new Error(
      'Usage: node scripts/import-letters.mjs <private-backup.json> (local only)',
    );
  const backup = JSON.parse(await readFile(file, 'utf8'));
  const { db, dispose } = await localDatabase();
  try {
    console.log(
      'Imported ' +
        (await importLetters(db, backup)) +
        ' letters into local D1. Source backup retained.',
    );
  } finally {
    await dispose();
  }
}
