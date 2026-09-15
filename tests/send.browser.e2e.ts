import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { workerRuntime } from '../scripts/worker-test-runtime.mjs';
import { migrate } from '../scripts/d1-test.mjs';
import {
  getMailboxState,
  receivedLetter,
  type Letter,
  type MailboxSnapshot,
} from '../lib/mailbox-state';

// Independent of APP_ORIGIN: using the configured value here hid the production
// mismatch. Every browser request is routed to disposable Miniflare, never live.
const deployedOrigin = 'https://mailbox.aselke2002.workers.dev';

void test(
  'production-origin browser send moves both worlds and persists after reload',
  { timeout: 120000 },
  async () => {
    const runtime = await workerRuntime({ production: true });
    const browser = await chromium.launch({
      headless: true,
      ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    });
    try {
      const db = await runtime.mf.getD1Database('MAILBOX_DB');
      await migrate(db);
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        serviceWorkers: 'block',
      });
      await context.route('**/*', async (route) => {
        const request = route.request();
        if (new URL(request.url()).origin !== deployedOrigin) {
          await route.abort();
          return;
        }
        const response = await runtime.mf.dispatchFetch(request.url(), {
          method: request.method(),
          headers: await request.allHeaders(),
          ...(request.postDataBuffer()
            ? { body: request.postDataBuffer() }
            : {}),
        });
        const headers = Object.fromEntries(response.headers);
        delete headers['content-encoding'];
        delete headers['content-length'];
        await route.fulfill({
          status: response.status,
          headers,
          body: Buffer.from(await response.arrayBuffer()),
        });
      });
      const indi = await context.newPage();
      const auggie = await context.newPage();
      const errors: string[] = [];
      for (const page of [indi, auggie])
        page.on('pageerror', (error) => errors.push(error.message));
      await indi.goto(deployedOrigin + '/indi');
      await auggie.goto(deployedOrigin + '/auggie');
      let previous: string | null = null;
      for (const [owner, sender, recipient] of [
        ['indi', indi, auggie],
        ['auggie', auggie, indi],
      ] as const) {
        // The app deliberately pauses its animations and polling in hidden tabs.
        await sender.bringToFront();
        if (previous) {
          await sender
            .getByRole('button', { name: 'Open your letter', exact: true })
            .click();
          await expect(
            sender.getByRole('button', { name: 'write back', exact: true }),
          ).toBeEnabled({ timeout: 15000 });
          await sender
            .getByRole('button', { name: 'write back', exact: true })
            .click();
        } else {
          await sender
            .getByRole('button', {
              name: 'Write the first letter',
              exact: true,
            })
            .click();
        }
        const body = `Isolated D1 send regression from ${owner}.`;
        const editor = sender.getByRole('textbox', {
          name: 'Letter body',
          exact: true,
        });
        await expect(editor).toBeEditable({ timeout: 15000 });
        await editor.fill(body);
        await sender
          .getByRole('textbox', { name: 'Typed signature', exact: true })
          .fill(owner);
        await sender
          .getByRole('button', { name: 'Choose stamp', exact: true })
          .click();
        await sender
          .getByRole('button', { name: 'Add flower stamp', exact: true })
          .click();
        const responsePromise = sender.waitForResponse(
          (response) =>
            response.url() === `${deployedOrigin}/api/${owner}/letters` &&
            response.request().method() === 'POST',
        );
        await sender
          .getByRole('button', { name: 'send letter', exact: true })
          .click();
        const response = await responsePromise;
        const payload = response.request().postDataJSON();
        assert.equal(
          await response.request().headerValue('origin'),
          deployedOrigin,
        );
        assert.deepEqual(Object.keys(payload).sort(), [
          'artwork',
          'body',
          'client_id',
          'reply_to',
        ]);
        assert.equal(payload.body, body);
        assert.equal(payload.reply_to, previous);
        assert.equal(response.status(), 201, await response.text());
        const sent = (await response.json()) as Letter;
        assert.equal(sent.sender, owner);
        assert.equal(sent.recipient, owner === 'indi' ? 'auggie' : 'indi');
        assert.equal(sent.read_at, null);
        assert.equal(
          await db
            .prepare('SELECT latest_id FROM mailbox_world WHERE singleton = 1')
            .first('latest_id'),
          sent.id,
        );
        assert.equal(
          await db.prepare('SELECT count(*) AS n FROM letters').first('n'),
          previous ? 2 : 1,
        );
        const waiting = sender.getByRole('button', {
          name: 'Your mailbox is waiting for a reply',
          exact: true,
        });
        try {
          await expect(waiting).toBeEnabled({ timeout: 35000 });
        } catch (error) {
          console.error(
            await sender.evaluate(() => ({
              hidden: document.hidden,
              phase: document
                .querySelector('[data-delivery-phase]')
                ?.getAttribute('data-delivery-phase'),
              envelope: document
                .querySelector('[data-envelope-stage]')
                ?.getAttribute('data-envelope-stage'),
            })),
            errors,
          );
          throw error;
        }
        await expect(sender.getByRole('dialog')).toHaveCount(0);
        await recipient.bringToFront();
        await expect(
          recipient.getByRole('button', {
            name: 'Open your letter',
            exact: true,
          }),
        ).toBeEnabled({ timeout: 15000 });
        for (const page of [sender, recipient]) await page.reload();
        await expect(waiting).toBeEnabled({ timeout: 15000 });
        await expect(
          sender.locator('.mailbox-hit .mailbox-art'),
        ).toHaveAttribute('data-mailbox-state', 'closed-down');
        await expect(
          recipient.getByRole('button', {
            name: 'Open your letter',
            exact: true,
          }),
        ).toBeEnabled({ timeout: 15000 });
        const snapshot = async (world: string) =>
          (await (
            await runtime.mf.dispatchFetch(
              `${deployedOrigin}/api/${world}/letters`,
            )
          ).json()) as MailboxSnapshot;
        const source = await snapshot(owner);
        const destination = await snapshot(sent.recipient);
        assert.equal(getMailboxState(owner, source).state, 'waiting');
        assert.equal(receivedLetter(owner, source), null);
        assert.equal(
          getMailboxState(sent.recipient, destination).state,
          'new-mail',
        );
        assert.equal(receivedLetter(sent.recipient, destination)?.id, sent.id);
        assert.deepEqual(destination.latest?.artwork, payload.artwork);
        const sentList = (await (
          await runtime.mf.dispatchFetch(
            `${deployedOrigin}/api/${owner}/letters?box=sent`,
          )
        ).json()) as Letter[];
        assert.equal(sentList[0].id, sent.id);
        previous = sent.id;
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await runtime.mf.dispose();
    }
  },
);
