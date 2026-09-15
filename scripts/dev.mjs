import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
const node = process.execPath;
if (!existsSync('.env.local')) {
  console.error('Run pnpm setup:local first.');
  process.exit(1);
}
const database = spawn(node, ['scripts/local-db.mjs'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  windowsHide: true,
});
let app;
database.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (!app && chunk.toString().includes('PostgreSQL ready')) {
    app = spawn(
      node,
      [
        'node_modules/vinext/dist/cli.js',
        'dev',
        '--host',
        '127.0.0.1',
        '--port',
        '3000',
      ],
      { stdio: 'inherit', windowsHide: true },
    );
    app.on('exit', (code) => {
      database.kill();
      if (code) process.exitCode = code;
    });
  }
});
function stop() {
  app?.kill();
  database.kill();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
database.on('exit', (code) => {
  app?.kill();
  if (code) process.exitCode = code;
});
