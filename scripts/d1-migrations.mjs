import './cloudflare-local-env.mjs';
import { readFile, readdir } from 'node:fs/promises';
import wrangler from 'wrangler';
export async function readD1Migrations(directory = 'migrations') {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  return Promise.all(
    names.map(async (name) => ({
      name,
      queries: wrangler.unstable_splitSqlQuery(
        await readFile(directory + '/' + name, 'utf8'),
      ),
    })),
  );
}
