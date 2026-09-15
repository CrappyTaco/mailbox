// Local fallback when the installed native workerd runtime cannot start.
import { spawn } from 'node:child_process';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
// Next's dotenv expansion also expands inherited values. Preserve the literal
// PBKDF2 separators without changing the stored credentials or Worker config.
for (const name of ['INDI_PASSCODE_HASH', 'AUGGIE_PASSCODE_HASH']) {
  process.env[name] = process.env[name]?.replaceAll('$', '\\$');
}
const qa = process.argv.includes('--qa');
const port = qa ? 3101 : 3100;
process.env.APP_ORIGIN = `http://localhost:${port}`;
if (qa) {
  process.env.MAILBOX_QA = 'true';
  process.env.SUPABASE_URL = 'http://127.0.0.1:55433';
}
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port), '--webpack'], { stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
