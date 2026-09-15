import { writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
// Keep unrelated existing settings when refreshing local origin configuration.
for (const file of ['.env.local', '.dev.vars']) {
  const existing = await readFile(file, 'utf8').catch(() => '');
  const preserved = existing
    .split(/\r?\n/)
    .filter((line) => line && !/^(?:APP_ORIGIN|LOCAL_PREVIEW)=/.test(line));
  await writeFile(
    file,
    [
      'LOCAL_PREVIEW=true',
      'APP_ORIGIN=http://localhost:3000',
      ...preserved,
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
}
const result = spawnSync(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'd1',
    'migrations',
    'apply',
    'MAILBOX_DB',
    '--local',
    '--config',
    'wrangler.jsonc',
  ],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: '.wrangler/logs',
      WRANGLER_SEND_METRICS: 'false',
    },
  },
);
process.exitCode = result.status ?? 1;
