import './cloudflare-local-env.mjs';
import { resolve } from 'node:path';
import wrangler from 'wrangler';
import { Miniflare } from './d1-test.mjs';
export async function localDatabase() {
  const config = wrangler.unstable_readConfig({ config: 'wrangler.jsonc' });
  const binding = config.d1_databases.find(
    (item) => item.binding === 'MAILBOX_DB',
  );
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("Local D1"); } }',
    compatibilityDate: config.compatibility_date,
    d1Databases: {
      MAILBOX_DB: binding.preview_database_id ?? binding.database_id,
    },
    d1Persist: resolve('.wrangler/state/v3/d1'),
  });
  return {
    db: await mf.getD1Database('MAILBOX_DB'),
    dispose: () => mf.dispose(),
  };
}
