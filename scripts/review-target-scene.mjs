import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = '.local/reference-reconstruction';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const errors = [],
  results = [];
const fixtures = [
  ['target-night', 1786, 880, '2026-09-12T21:32:00Z'],
  ['target-day', 1786, 880, '2026-09-12T05:00:00Z'],
  ['target-dawn', 1366, 768, '2026-09-11T23:00:00Z'],
  ['target-dusk', 1920, 1080, '2026-09-12T11:30:00Z'],
  ['target-mobile', 390, 844, '2026-09-12T21:32:00Z'],
];
try {
  for (const [name, width, height, time] of fixtures) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    const letter = {
      id: 'target-visual-fixture',
      sender: 'auggie',
      recipient: 'indi',
      body: 'A letter for the visual reconstruction check.',
      created_at: time,
      delivered_at: time,
      read_at: time,
      reply_to: null,
    };
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          route.request().url().endsWith('/read')
            ? letter
            : {
                latest: letter,
                received: letter,
                last_incoming_at: time,
                established_at: time,
              },
        ),
      }),
    );
    await page.goto('http://127.0.0.1:3100/indi?skyTime=' + time, {
      waitUntil: 'networkidle',
    });
    await expect(page.locator('.mailbox-hit .mailbox-art')).toHaveAttribute(
      'data-mailbox-state',
      'open-up',
    );
    await page.screenshot({ path: `${out}/${name}.png` });
    const metrics = await page.evaluate(() => {
      const box = document
        .querySelector('.mailbox-hit')
        .getBoundingClientRect();
      const stage = document
        .querySelector('.reference-stage')
        .getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        scale: [stage.width / 1786, stage.height / 880],
        layers: [...document.querySelectorAll('[data-sky-layer]')].map(
          (n) => n.dataset.skyLayer,
        ),
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(Math.abs(metrics.scale[0] - metrics.scale[1])).toBeLessThan(0.001);
    expect(metrics.layers).toEqual(['stars', 'clouds', 'celestials']);
    results.push({ name, ...metrics });
    console.log(name, JSON.stringify(metrics));
    await context.close();
  }
  await writeFile(
    `${out}/checks.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
