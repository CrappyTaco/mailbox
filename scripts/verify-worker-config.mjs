import assert from 'node:assert/strict';
import { workerRuntime } from './worker-test-runtime.mjs';
import { migrate } from './d1-test.mjs';
const missing = await workerRuntime({ database: false, production: true });
try {
  assert.equal(missing.config.name, 'mailbox');
  assert.equal(missing.config.keep_vars, true);
  assert.equal(missing.config.vars.LOCAL_PREVIEW, 'false');
  assert.equal(
    missing.config.vars.APP_ORIGIN,
    'https://auggieisromantic.uk',
    'The custom domain must remain an accepted browser origin.',
  );
  assert.equal(
    missing.config.vars.APP_ADDITIONAL_ORIGINS,
    'https://mailbox.aselke2002.workers.dev',
    'The workers.dev address must also remain an accepted browser origin.',
  );
  assert.equal(missing.config.d1_databases[0].binding, 'MAILBOX_DB');
  const response = await missing.mf.dispatchFetch(
    missing.origin + '/api/indi/letters',
  );
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('MAILBOX_DB'));
} finally {
  await missing.mf.dispose();
}
const configured = await workerRuntime({ production: true });
try {
  const db = await configured.mf.getD1Database('MAILBOX_DB');
  assert.equal(
    (await configured.mf.dispatchFetch(configured.origin + '/api/indi/letters'))
      .status,
    503,
  );
  await migrate(db);
  for (const owner of ['indi', 'auggie']) {
    const response = await configured.mf.dispatchFetch(
      configured.origin + `/api/${owner}/letters`,
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).latest, null);
  }
} finally {
  await configured.mf.dispose();
}
console.log(
  'Compiled Worker: binding retained, missing binding/schema return 503, actual D1 with no database credentials returns 200 for both worlds.',
);
