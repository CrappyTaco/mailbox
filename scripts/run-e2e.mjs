import { spawn } from 'node:child_process';
import { workerRuntime } from './worker-test-runtime.mjs';
import { migrate } from './d1-test.mjs';
// Disposable actual D1 and built Worker; never use the personal mailbox store.
const runtime = await workerRuntime({ port: 3101 });
try {
  await migrate(await runtime.mf.getD1Database('MAILBOX_DB'));
  const child = spawn(
    process.execPath,
    [
      '--import',
      './scripts/register-tests.mjs',
      '--test',
      'tests/preview.e2e.ts',
    ],
    {
      stdio: 'inherit',
      windowsHide: true,
      env: { ...process.env, MAILBOX_TEST_ORIGIN: runtime.origin },
    },
  );
  process.exitCode = await new Promise((resolve) =>
    child.on('exit', (code) => resolve(code ?? 1)),
  );
} finally {
  await runtime.mf.dispose();
}
