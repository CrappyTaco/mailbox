// Browser-only fixtures intercept every API call. Personal mail is never touched.
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const out = '.local/mailbox-polish';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const errors = [];
try {
  for (const [owner, time] of [
    ['indi', '2026-09-12T03:33:00Z'],
    ['auggie', '2026-09-12T08:17:00Z'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    const other = owner === 'indi' ? 'auggie' : 'indi';
    let latest = {
      id: 'mailbox-art-qa',
      sender: other,
      recipient: owner,
      body: 'A letter for the animation check.',
      created_at: time,
      delivered_at: time,
      read_at: null,
      reply_to: null,
    };
    const received = latest;
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      let result;
      if (url.endsWith('/read')) result = latest = { ...latest, read_at: time };
      else if (
        route.request().method() === 'POST' &&
        url.endsWith('/letters')
      ) {
        result = latest = {
          ...route.request().postDataJSON(),
          id: 'mailbox-art-sent',
          sender: owner,
          recipient: other,
          created_at: time,
          delivered_at: time,
          read_at: null,
        };
      } else
        result = {
          latest,
          received,
          last_incoming_at: time,
          established_at: time,
        };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(result),
      });
    });
    await page.goto(`http://127.0.0.1:3100/${owner}?skyTime=${time}`, {
      waitUntil: 'networkidle',
    });
    await page
      .getByRole('button', { name: 'Open your letter', exact: true })
      .click();
    await expect(
      page.locator('.mailbox-art.is-retrieving .mailbox-letter'),
    ).toHaveCSS('opacity', '1');
    await expect(
      page.locator('.mailbox-hit .mailbox-hinged-door'),
    ).toHaveAttribute('data-door-progress', '1.000');
    await page.screenshot({ path: `${out}/${owner}-retrieval.png` });
    const close = page.getByRole('button', {
      name: 'Put the letter away',
      exact: true,
    });
    await expect(close).toBeEnabled({ timeout: 15000 });
    await page.getByRole('button', { name: 'write back', exact: true }).click();
    const body = page.getByRole('textbox', {
      name: 'Letter body',
      exact: true,
    });
    await expect(body).toBeEditable({ timeout: 15000 });
    await body.fill('A fixture letter for the mailbox animation polish.');
    await page
      .getByRole('textbox', { name: 'Typed signature', exact: true })
      .fill('Art review');
    await page
      .getByRole('button', { name: 'Choose stamp', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Add flower stamp', exact: true })
      .click();
    await page.evaluate(() => {
      window.mailboxPhases = [];
      new MutationObserver(() => {
        const phase = document
          .querySelector('[data-delivery-phase]')
          ?.getAttribute('data-delivery-phase');
        if (phase && !window.mailboxPhases.includes(phase))
          window.mailboxPhases.push(phase);
      }).observe(document.body, {
        subtree: true,
        attributes: true,
        childList: true,
      });
    });
    await page
      .getByRole('button', { name: 'send letter', exact: true })
      .click();
    await expect(page.locator('[data-delivery-phase="inserting"]')).toBeVisible(
      { timeout: 25000 },
    );
    await page.screenshot({ path: `${out}/${owner}-sending.png` });
    await expect(
      page.getByRole('button', {
        name: 'Your mailbox is waiting for a reply',
        exact: true,
      }),
    ).toBeEnabled({ timeout: 15000 });
    const phases = await page.evaluate(() => window.mailboxPhases);
    for (const phase of [
      'departing',
      'travelling',
      'inserting',
      'closing',
      'raising',
      'complete',
    ])
      expect(phases).toContain(phase);
    await expect(page.locator('.mailbox-hit .mailbox-art')).toHaveAttribute(
      'data-mailbox-state',
      'closed-down',
    );
    console.log(
      owner,
      'retrieval → reply → sealing → globe → insertion → closure → flag → world passed;',
      phases.join(', '),
    );
    await context.close();
  }
  expect(errors).toEqual([]);
  console.log(
    'No browser errors. All letter writes were intercepted fixtures.',
  );
} finally {
  await browser.close();
}
