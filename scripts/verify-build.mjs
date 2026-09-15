import { readFile, readdir, stat } from 'node:fs/promises';
const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
if (config.main !== 'index.js')
  throw new Error('Unexpected Worker entry point.');
const entry = await readFile('dist/server/index.js', 'utf8');
if (!/export/.test(entry)) throw new Error('Worker module is missing exports.');
const env = await readFile('.env.local', 'utf8').catch(() => '');
const secrets = env
  .split(/\r?\n/)
  .filter((line) =>
    /^(SUPABASE_SERVICE_ROLE_KEY|SESSION_SECRET|INDI_PASSCODE_HASH|AUGGIE_PASSCODE_HASH)=/.test(
      line,
    ),
  )
  .map((line) => line.slice(line.indexOf('=') + 1).replace(/^'|'$/g, ''))
  .filter(Boolean);
async function inspect(directory) {
  for (const name of await readdir(directory)) {
    const path = directory + '/' + name;
    if ((await stat(path)).isDirectory()) {
      await inspect(path);
      continue;
    }
    if (!/\.(js|json|html|css)$/.test(name)) continue;
    const data = await readFile(path, 'utf8');
    if (secrets.some((secret) => data.includes(secret)))
      throw new Error('A private value was embedded in ' + path);
  }
}
await inspect('dist');
console.log('Worker entry, assets, and build secret scan passed.');
