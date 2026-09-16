// Browser-only fixtures intercept every API call. Personal mail is never touched.
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const out = '.local/mailbox-polish';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const errors = [];
try {
  for (const [owner, time, width, height, reducedMotion] of [
    ['indi', '2026-09-12T03:33:00Z', 1280, 900, 'no-preference'],
    ['auggie', '2026-09-12T08:17:00Z', 1280, 900, 'no-preference'],
    ['indi', '2026-09-12T03:33:00Z', 390, 844, 'no-preference'],
    ['auggie', '2026-09-12T08:17:00Z', 390, 844, 'reduce'],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion,
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
    await expect(
      page.locator('.world-header, .reference-wordmark'),
    ).toHaveCount(0);
    await expect(page.getByText('Our Mailbox', { exact: true })).toHaveCount(0);
    expect(await page.locator('.world-scene').boundingBox()).toMatchObject({
      x: 0,
      y: 0,
      width,
      height,
    });
    await page.screenshot({ path: `${out}/${owner}-${width}-world.png` });
    await page
      .getByRole('button', { name: 'Open your letter', exact: true })
      .click();
    if (reducedMotion === 'no-preference')
      await expect(
        page.locator('.mailbox-art.is-retrieving .mailbox-letter'),
      ).toHaveCSS('opacity', '1');
    await expect(
      page.locator('.mailbox-hit .mailbox-hinged-door'),
    ).toHaveAttribute('data-door-progress', '1.000');
    await page.screenshot({ path: `${out}/${owner}-${width}-retrieval.png` });
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
    await expect(page.locator('.delivery-world > text')).toHaveText([
      'Seattle',
      'Bangkok',
    ]);
    await expect(page.locator('[data-receiving-mouth]')).toHaveAttribute(
      'data-receiving-mouth',
      'left',
    );
    await page.screenshot({ path: `${out}/${owner}-${width}-sending.png` });
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
      `${width}px ${reducedMotion}`,
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
