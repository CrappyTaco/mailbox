import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { workerRuntime } from './worker-test-runtime.mjs';
import { migrate } from './d1-test.mjs';
const qa = process.argv.includes('--qa');
const serving = process.argv.includes('--serve');
const requestedPort = process.argv
  .find((arg) => arg.startsWith('--port='))
  ?.split('=')[1];
const port = requestedPort ? Number(requestedPort) : qa ? 3101 : 3100;
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid local port.');
const runtime = await workerRuntime({
  port: serving ? port : undefined,
  persist: serving && !qa ? resolve('.wrangler/state/v3/d1') : false,
});
try {
  if (!serving || qa)
    await migrate(await runtime.mf.getD1Database('MAILBOX_DB'));
  for (const owner of ['indi', 'auggie']) {
    const page = await runtime.mf.dispatchFetch(runtime.origin + '/' + owner);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes('Our Mailbox'));
    const letters = await runtime.mf.dispatchFetch(
      runtime.origin + '/api/' + owner + '/letters',
    );
    assert.equal(letters.status, 200);
    assert.ok((await letters.json()).established_at);
  }
  assert.equal(
    (
      await runtime.mf.dispatchFetch(
        runtime.origin + '/fonts/pixelify-sans-latin-400-normal.woff2',
      )
    ).status,
    200,
  );
  console.log(
    'Built Worker passed: both pages, fonts, public mailbox APIs and actual local D1.',
  );
  if (serving) {
    console.log('Worker ready at ' + runtime.origin);
    await new Promise((resolve) => {
      process.once('SIGINT', resolve);
      process.once('SIGTERM', resolve);
    });
  }
} finally {
  await runtime.mf.dispose();
}
