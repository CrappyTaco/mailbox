import { spawn } from 'node:child_process';
// Use the verified production runtime for the normal local preview.
// pnpm dev:vinext remains available for Vite's live editing / hot reload.
async function run(args) {
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: '.wrangler/logs',
      WRANGLER_SEND_METRICS: 'false',
    },
  });
  const stop = () => child.kill();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
  return code;
}
const built = await run(['node_modules/vinext/dist/cli.js', 'build']);
process.exitCode =
  built || (await run(['scripts/verify-worker.mjs', '--serve', '--port=3000']));
