import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { readD1Migrations } from './d1-migrations.mjs';
const require = createRequire(import.meta.url);
export const { Miniflare } = require(
  require.resolve('miniflare', {
    paths: [dirname(require.resolve('wrangler/package.json'))],
  }),
);
export async function migrate(db) {
  for (const migration of await readD1Migrations('migrations'))
    await db.batch(migration.queries.map((sql) => db.prepare(sql)));
}
/** @param {boolean | string} persist */
export async function testDatabase(persist = false) {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("D1 test"); } }',
    compatibilityDate: '2026-05-15',
    d1Databases: { MAILBOX_DB: 'mailbox-test' },
    d1Persist: persist,
  });
  const db = await mf.getD1Database('MAILBOX_DB');
  return { mf, db };
}
