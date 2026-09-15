import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const out = '.local/reference-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const errors = [];
const fixtures = [
  {
    name: 'day',
    time: '2026-09-12T03:33:00Z',
    state: 'incoming',
    viewport: { width: 1672, height: 941 },
  },
  {
    name: 'night',
    time: '2026-09-12T15:17:00Z',
    state: 'waiting',
    viewport: { width: 1672, height: 941 },
  },
  {
    name: 'mobile-day',
    time: '2026-09-12T03:33:00Z',
    state: 'incoming',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'mobile-night',
    time: '2026-09-12T15:17:00Z',
    state: 'waiting',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'night-up',
    time: '2026-09-12T15:17:00Z',
    state: 'incoming',
    viewport: { width: 1672, height: 941 },
  },
  {
    name: 'day-down',
    time: '2026-09-12T03:33:00Z',
    state: 'waiting',
    viewport: { width: 1672, height: 941 },
  },
];
for (const fixture of fixtures) {
  const context = await browser.newContext({
    viewport: fixture.viewport,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const letter = {
    id: 'reference-qa',
    sender: fixture.state === 'incoming' ? 'auggie' : 'indi',
    recipient: fixture.state === 'incoming' ? 'indi' : 'auggie',
    body: 'A little letter for the artwork check.',
    created_at: fixture.time,
    delivered_at: fixture.time,
    read_at: null,
    reply_to: null,
  };
  const snapshot = {
    latest: letter,
    received: fixture.state === 'incoming' ? letter : null,
    last_incoming_at: fixture.time,
    established_at: fixture.time,
  };
  await page.route('**/api/**', (route) => {
    if (route.request().url().endsWith('/read')) letter.read_at = fixture.time;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        route.request().url().endsWith('/read') ? letter : snapshot,
      ),
    });
  });
  await page.goto('http://127.0.0.1:3100/indi?skyTime=' + fixture.time, {
    waitUntil: 'networkidle',
  });
  await page.locator('.mailbox-art').first().waitFor();
  await page
    .getByRole('button', {
      name:
        fixture.state === 'incoming'
          ? 'Open your letter'
          : 'Your mailbox is waiting for a reply',
      exact: true,
    })
    .waitFor();
  await expect(
    page.locator('.mailbox-hit .mailbox-pivot-flag'),
  ).toHaveAttribute(
    'data-flag-progress',
    fixture.state === 'incoming' ? '1.000' : '0.000',
  );
  await page.screenshot({ path: `${out}/${fixture.name}.png` });
  console.log(
    fixture.name,
    await page
      .locator('.mailbox-art')
      .first()
      .getAttribute('data-mailbox-state'),
    await page.locator('.world-clock').innerText(),
    await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
      night: getComputedStyle(document.querySelector('.reference-night'))
        .opacity,
    })),
  );
  if (fixture.state === 'incoming') {
    await page
      .getByRole('button', { name: 'Open your letter', exact: true })
      .click();
    const close = page.getByRole('button', {
      name: 'Put the letter away',
      exact: true,
    });
    await expect(close).toBeVisible();
    await expect(close).toBeEnabled();
    await close.click();
    await expect(page.locator('.mailbox-hit .mailbox-art')).toHaveAttribute(
      'data-mailbox-state',
      'open-up',
    );
    await expect(
      page.locator('.mailbox-hit .mailbox-hinged-door'),
    ).toHaveAttribute('data-door-progress', '1.000');
    await expect(close).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Open your letter', exact: true }),
    ).toBeEnabled();
    await page.screenshot({ path: `${out}/${fixture.name}-open.png` });
    console.log(
      fixture.name,
      'retrieval, reading, closing and open mailbox passed',
    );
  }
  await context.close();
}
console.log('Page errors:', errors);
await browser.close();
if (errors.length) process.exitCode = 1;
