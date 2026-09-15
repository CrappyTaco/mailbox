import { localDatabase } from './d1-local.mjs';
const days = Number(process.argv[2]);
if (!Number.isInteger(days) || days < 0 || days > 365)
  throw new Error('Use an integer age from 0 to 365 days.');
const { db, dispose } = await localDatabase();
try {
  const at = new Date(Date.now() - days * 86400000).toISOString();
  await db.batch([
    db.prepare('UPDATE mailbox_world SET established_at = ?').bind(at),
    db
      .prepare('UPDATE letters SET created_at = ?, delivered_at = ?')
      .bind(at, at),
  ]);
  console.log('Local D1 timestamps set to ' + days + ' days ago.');
} finally {
  await dispose();
}
