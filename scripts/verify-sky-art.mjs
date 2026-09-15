// Real SVG crops and real world CSS in Chromium. API traffic stays in fixtures.
import { chromium, expect } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { ReferenceCrop } from '../components/world/ReferenceArt.tsx';
import { TARGET_MASKS } from '../lib/target-masks.ts';
const out = '.local/sky-polish';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({
    viewport: { width: 1672, height: 941 },
    reducedMotion: 'reduce',
  });
  const contact = [];
  for (const tone of ['day', 'night'])
    for (const [i, box] of TARGET_MASKS.cloudBounds.entries()) {
      const [x, y, w, h] = box;
      const source = renderToStaticMarkup(
        createElement(
          'svg',
          {
            width: w,
            height: h,
            viewBox: `${x} ${y} ${w} ${h}`,
            shapeRendering: 'crispEdges',
          },
          createElement(ReferenceCrop, {
            tone,
            path: TARGET_MASKS.clouds[i],
          }),
        ),
        { identifierPrefix: `${tone}-${i}-` },
      );
      await page.setViewportSize({ width: w, height: h });
      await page.setContent(
        `<base href="http://127.0.0.1:3100"><style>html,body{margin:0;background:transparent}image{image-rendering:pixelated}</style>${source}`,
      );
      await page.evaluate(async () => {
        const img = new Image();
        img.src = document.querySelector('image').getAttribute('href');
        await img.decode();
      });
      const png = await page.screenshot({ omitBackground: true });
      const { data, info } = await sharp(png)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let transparent = 0,
        opaque = 0;
      for (let p = 0; p < w * h; p++) {
        const a = data[p * 4 + 3];
        assert.ok(a === 0 || a === 255, `${tone} ${i}: alpha halo`);
        if (a === 0) transparent++;
        else opaque++;
      }
      for (const p of [0, w - 1, (h - 1) * w, h * w - 1])
        assert.equal(data[p * 4 + 3], 0, `${tone} ${i}: opaque box corner`);
      assert.ok(
        transparent > w * h * 0.2 && opaque > w * h * 0.15,
        `${tone} ${i}: cloud must have a filled center and transparent surroundings`,
      );
      contact.push(`<article><p>${tone} cloud ${i + 1}</p>${source}</article>`);
      assert.equal(info.width, w);
    }
  await page.setViewportSize({ width: 1200, height: 680 });
  await page.setContent(
    `<base href="http://127.0.0.1:3100"><style>body{margin:0;display:grid;grid-template-columns:repeat(4,300px);font:14px monospace;background:#eee}article{height:220px;background:repeating-conic-gradient(#87909b 0% 25%,#c8cdd1 0% 50%) 0/20px 20px}p{margin:8px}image{image-rendering:pixelated}</style>${contact.join('')}`,
  );
  await page.evaluate(async () => {
    await Promise.all(
      [
        ...new Set(
          [...document.querySelectorAll('image')].map((n) =>
            n.getAttribute('href'),
          ),
        ),
      ].map(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
      }),
    );
  });
  await page.screenshot({
    path: `${out}/cloud-transparency.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        latest: null,
        last_incoming_at: null,
        established_at: '2026-09-12T00:00:00Z',
      }),
    }),
  );
  await page.goto('http://127.0.0.1:3100/indi?skyTime=2026-09-12T03:33:00Z', {
    waitUntil: 'networkidle',
  });
  await page.addStyleTag({
    content:
      '.reference-cloud,.sun-radiance,.reference-star{animation:none!important}.reference-night,.reference-celestial{transition:none!important}',
  });
  let checks = 0;
  for (const night of [0, 0.25, 0.5, 0.75, 1])
    for (const kind of ['sun', 'moon']) {
      const center = await page.evaluate(
        ({ night, kind }) => {
          document
            .querySelector('.our-world')
            .style.setProperty('--reference-night', String(night));
          const clouds = document.querySelector('[data-sky-layer="clouds"]');
          clouds.style.visibility = 'visible';
          const front = document.querySelector('[data-sky-layer="celestials"]');
          if (
            !(
              clouds.compareDocumentPosition(front) &
              Node.DOCUMENT_POSITION_FOLLOWING
            )
          )
            throw new Error('Celestials must paint after clouds');
          for (const node of document.querySelectorAll('[data-celestial]')) {
            const selected = node.getAttribute('data-celestial') === kind;
            node.setAttribute('opacity', selected ? '1' : '0');
            node.style.transform = 'translate(-229px,-32px)';
          }
          const target = document.querySelector(`[data-celestial="${kind}"]`);
          const p = new DOMPoint(606, 257).matrixTransform(
            target.getScreenCTM(),
          );
          return { x: p.x, y: p.y };
        },
        { night, kind },
      );
      const clip = {
        x: Math.round(center.x) - 12,
        y: Math.round(center.y) - 12,
        width: 24,
        height: 24,
      };
      const withCloud = await sharp(await page.screenshot({ clip }))
        .raw()
        .toBuffer();
      await page.locator('[data-sky-layer="clouds"]').evaluate((node) => {
        node.style.visibility = 'hidden';
      });
      const withoutCloud = await sharp(await page.screenshot({ clip }))
        .raw()
        .toBuffer();
      // Chromium can round a composited color by one unit when a backing layer
      // changes. A cloud in front changes many channels by far more than that.
      const delta = withCloud.map((v, i) => Math.abs(v - withoutCloud[i]));
      assert.ok(
        Math.max(...delta) <= 1,
        `${kind} covered by clouds at lighting ${night}`,
      );
      await page.locator('[data-sky-layer="clouds"]').evaluate((node) => {
        node.style.visibility = 'visible';
        document.querySelector('[data-sky-layer="celestials"]').after(node);
      });
      const wrongOrder = await sharp(await page.screenshot({ clip }))
        .raw()
        .toBuffer();
      assert.ok(
        withCloud.some((v, i) => Math.abs(v - wrongOrder[i]) > 4),
        'Positive control must detect a cloud placed in front',
      );
      await page
        .locator('[data-sky-layer="clouds"]')
        .evaluate((node) =>
          document.querySelector('[data-sky-layer="celestials"]').before(node),
        );
      if ((kind === 'sun' && night === 0) || (kind === 'moon' && night === 1))
        await page.screenshot({ path: `${out}/${kind}-in-front.png` });
      checks++;
    }
  await expect(page.locator('.mailbox-hit')).toBeVisible();
  console.log(
    `Twelve cloud lighting samples: binary alpha, transparent corners, filled silhouettes. ${checks} forced sun/moon overlap pixel comparisons passed across five lighting blends.`,
  );
} finally {
  await browser.close();
}
