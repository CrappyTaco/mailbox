// Render production components against a bare-scene baseline. This fixture
// serves artwork only; no mailbox APIs or personal letters are accessed.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeliveryScene } from '../components/letter/DeliveryScene.tsx';
import { Mailbox } from '../components/mailbox/Mailbox.tsx';
import { MAILBOX_SHELL, MAILBOX_PASSAGE_FACE } from '../lib/mailbox-sprites.ts';
import { MAILBOX_ART } from '../lib/world-style.ts';
import {
  deliveryFrame,
  DEPARTURE_SECONDS,
  FLIGHT_SECONDS,
  INSERT_SECONDS,
} from '../lib/delivery.ts';

const out = '.local/mailbox-physics';
await mkdir(out, { recursive: true });
const assets = new Map();
for (const file of [
  'shell.png',
  'interior.png',
  'exterior.png',
  'doors.png',
  'flags.png',
  'letter.png',
])
  assets.set(
    '/world/mailbox/' + file,
    await readFile('public/world/mailbox/' + file),
  );
for (const file of ['sun.png', 'moon.png'])
  assets.set('/world/' + file, await readFile('public/world/' + file));
const server = createServer((request, response) => {
  const asset = assets.get(request.url);
  response.writeHead(asset ? 200 : 404, { 'Content-Type': 'image/png' });
  response.end(asset);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const css = await readFile('components/letter/delivery.css', 'utf8');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const polygon = MAILBOX_PASSAGE_FACE.map(([x, y]) => [
  MAILBOX_SHELL.x + x * MAILBOX_SHELL.scale,
  MAILBOX_SHELL.y + y * MAILBOX_SHELL.scale,
]);
function inside(x, y) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i],
      [bx, by] = polygon[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      result = !result;
  }
  return result;
}
let sequence = 0;
async function render(element, style = '') {
  const html = renderToStaticMarkup(element, {
    identifierPrefix: `physics-${sequence++}-`,
  });
  await page.setContent(
    `<base href="${origin}"><style>html,body{margin:0}image{image-rendering:pixelated}${css}${style}</style>${html}`,
  );
  await page.evaluate(async () => {
    await Promise.all(
      [
        ...new Set(
          [...document.querySelectorAll('image')].map((node) =>
            node.getAttribute('href'),
          ),
        ),
      ].map(async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
      }),
    );
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}
const pixels = async (png) => sharp(png).ensureAlpha().raw().toBuffer();
const contacts = [];
let checked = 0;
try {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 900, height: 650 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const night of [0, 1])
      for (const recipient of ['indi', 'auggie']) {
        const times = new Set([
          0, 0.4, 0.55, 0.7, 0.9, 1.199999, 1.2, 2.5, 4, 6.199999, 6.2, 6.8, 7,
          7.2, 7.6, 7.8, 8, 8.4, 8.9,
        ]);
        // Densely sample extraction, insertion and every closing sprite on desktop.
        if (viewport.width === 1280) {
          for (let n = 0; n <= 24; n++) times.add((n * DEPARTURE_SECONDS) / 24);
          for (let n = 0; n <= 32; n++)
            times.add(FLIGHT_SECONDS + (n * INSERT_SECONDS) / 32);
          for (let n = 0; n <= 8; n++) times.add(7.8 + (n * 0.6) / 8);
        }
        for (const time of [...times].sort((a, b) => a - b)) {
          const frame = deliveryFrame(time, 0);
          await render(
            createElement(DeliveryScene, {
              frame,
              recipient,
              hour: night ? 0 : 12,
            }),
            `.delivery-stage{--reference-night:${night}}.mailbox-paint{filter:brightness(${1 - night * 0.12})}`,
          );
          const imageNode = page.locator('.delivery-envelope image');
          assert.deepEqual(
            await page.locator('.delivery-world > text').allTextContents(),
            ['Seattle', 'Bangkok'],
          );
          assert.equal(
            await page
              .locator('[data-receiving-mouth]')
              .getAttribute('data-receiving-mouth'),
            'left',
          );
          assert.equal(
            await imageNode.count(),
            1,
            'exactly one envelope owns each frame',
          );
          assert.equal(
            await page.locator('.mailbox-shell').count(),
            2,
            'one shell per mailbox',
          );
          const geometry = await imageNode.evaluate((node) => {
            const m = node.getScreenCTM(),
              inv = m.inverse(),
              bounds = node.getBoundingClientRect();
            return {
              bounds: {
                left: bounds.left,
                top: bounds.top,
                right: bounds.right,
                bottom: bounds.bottom,
              },
              inverse: [inv.a, inv.b, inv.c, inv.d, inv.e, inv.f],
              x: node.x.baseVal.value,
              y: node.y.baseVal.value,
              width: node.width.baseVal.value,
              height: node.height.baseVal.value,
              area:
                node.width.baseVal.value *
                node.height.baseVal.value *
                Math.abs(m.a * m.d - m.b * m.c),
              upright:
                m.a > 0 &&
                m.d > 0 &&
                Math.abs(m.b) < 1e-8 &&
                Math.abs(m.c) < 1e-8,
            };
          });
          assert.ok(
            geometry.upright,
            'the same envelope artwork stays upright across both handoffs and routes',
          );
          const png = await page.screenshot();
          // Inspect alpha coverage independently of paper/ink colors. Dark
          // envelope contours can match the dark cavity, and filtered PNG RGB
          // sampling changes on repaint. A white silhouette keeps the exact
          // source alpha, transforms, clipping and occlusion, with clear contrast.
          await imageNode.evaluate((node) => {
            node.style.filter = 'brightness(0) invert(1)';
          });
          const painted = await pixels(await page.screenshot());
          await page.locator('.delivery-envelope').evaluate((node) => {
            node.style.visibility = 'hidden';
          });
          const barePng = await page.screenshot(),
            bare = await pixels(barePng);
          const clear =
            ['departing', 'travelling', 'waiting', 'inserting'].includes(
              frame.phase,
            ) &&
            (frame.phase === 'travelling' ||
              frame.letterX + MAILBOX_ART.stored.width <=
                MAILBOX_ART.mouth.right);
          let reference;
          let referencePng;
          if (clear) {
            // Keep the identical SVG viewport ancestry (and pixel sampling),
            // but draw the letter last without its passage clip. Reparenting an
            // image to the world SVG changes Chromium's nearest-pixel sampling
            // even with an equivalent screen matrix.
            await imageNode.evaluate((node) => {
              const envelope = node.closest('.delivery-envelope');
              const source = envelope.parentElement.hasAttribute('clip-path')
                ? envelope.parentElement
                : envelope;
              const layer = source.cloneNode(true);
              layer.id = 'unoccluded-envelope';
              layer.removeAttribute('clip-path');
              (layer.matches('.delivery-envelope')
                ? layer
                : layer.querySelector('.delivery-envelope')
              ).style.visibility = '';
              source.parentElement.append(layer);
            });
            referencePng = await page.screenshot();
            reference = await pixels(referencePng);
            await page
              .locator('#unoccluded-envelope')
              .evaluate((node) => node.remove());
          }
          let visible = 0;
          let expectedVisible = 0;
          const changed = [];
          const [a, b, c, d, e, f] = geometry.inverse;
          const left = Math.max(0, Math.floor(geometry.bounds.left) - 1);
          const top = Math.max(0, Math.floor(geometry.bounds.top) - 1);
          const width =
            Math.min(viewport.width, Math.ceil(geometry.bounds.right) + 1) -
            left;
          const height =
            Math.min(viewport.height, Math.ceil(geometry.bounds.bottom) + 1) -
            top;
          for (let n = 0; n < width * height; n++) {
            const p =
              (top + Math.floor(n / width)) * viewport.width +
              left +
              (n % width);
            const i = p * 4;
            if (
              reference &&
              reference[i] > 240 &&
              reference[i + 1] > 240 &&
              reference[i + 2] > 240 &&
              !reference.subarray(i, i + 4).equals(bare.subarray(i, i + 4))
            )
              expectedVisible++;
            if (painted.subarray(i, i + 4).equals(bare.subarray(i, i + 4)))
              continue;
            if (
              painted[i] <= 240 ||
              painted[i + 1] <= 240 ||
              painted[i + 2] <= 240
            )
              continue;
            const sx = (p % viewport.width) + 0.5,
              sy = Math.floor(p / viewport.width) + 0.5;
            const x = a * sx + c * sy + e,
              y = b * sx + d * sy + f;
            // crispEdges rounds a clip to device pixels. A boundary pixel may
            // straddle the analytic edge; reject leaks beyond that one pixel.
            const halfPixel =
              0.5 *
              Math.max(Math.abs(a) + Math.abs(c), Math.abs(b) + Math.abs(d));
            // Limit the differential to the envelope's projected rectangle.
            // Repainting filtered PNGs can resample unrelated shell edge pixels.
            if (
              x < geometry.x - halfPixel ||
              x > geometry.x + geometry.width + halfPixel ||
              y < geometry.y - halfPixel ||
              y > geometry.y + geometry.height + halfPixel
            )
              continue;
            visible++;
            if (time >= 8.4)
              changed.push({
                x,
                y,
                paint: [...painted.subarray(i, i + 3)],
                bare: [...bare.subarray(i, i + 3)],
              });
            if (frame.phase === 'travelling') continue;
            const allowed = [-halfPixel, 0, halfPixel].some((dx) =>
              [-halfPixel, 0, halfPixel].some((dy) => inside(x + dx, y + dy)),
            );
            if (!allowed) {
              await writeFile(`${out}/failed.png`, png);
              await writeFile(`${out}/failed-bare.png`, barePng);
              assert.fail(
                `${recipient} ${viewport.width}px ${time}s: letter through solid wall at ${x},${y}`,
              );
            }
          }
          // Check the whole transit, especially the far jamb. The old verifier
          // only checked completeness after the letter was already outside,
          // allowing a sliced envelope at the entrance to pass unnoticed.
          if (clear) {
            if (visible < expectedVisible - 1) {
              await writeFile(`${out}/incomplete.png`, png);
              await writeFile(`${out}/unoccluded.png`, referencePng);
              await writeFile(
                `${out}/incomplete-geometry.json`,
                JSON.stringify(geometry),
              );
            }
            assert.ok(
              expectedVisible > 0 && visible >= expectedVisible - 1,
              `${recipient} ${viewport.width}px ${time}: incomplete transit envelope (${visible}/${expectedVisible} rendered reference pixels)`,
            );
          }
          if (time >= 8.4)
            assert.equal(
              visible,
              0,
              `closed coverage: ${recipient} ${viewport.width} night ${night} time ${time}: ${JSON.stringify(changed)}`,
            );
          if (time === 0)
            assert.ok(
              visible > geometry.area * 0.85,
              'stored mail must show a complete readable envelope in the open cavity',
            );
          if (
            viewport.width === 1280 &&
            night === 0 &&
            recipient === 'indi' &&
            [0, 0.55, 0.9, 2.5, 6.8, 7.2, 7.8, 8.9].includes(time)
          )
            contacts.push({
              input: await sharp(png).resize(480, 338).png().toBuffer(),
              left: (contacts.length % 4) * 480,
              top: Math.floor(contacts.length / 4) * 338,
            });
          checked++;
        }
        console.log(
          `${viewport.width}px ${recipient} ${night ? 'night' : 'day'}: ${times.size} frames passed`,
        );
      }
  }
  await sharp({
    create: { width: 1920, height: 676, channels: 4, background: '#252238' },
  })
    .composite(contacts)
    .png()
    .toFile(`${out}/journey-contact.png`);
  // A separate close-up sweep exercises the same local clipping at larger scale.
  await page.setViewportSize({ width: 800, height: 420 });
  for (const doorProgress of [
    0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1,
  ]) {
    await render(
      createElement(Mailbox, { mail: true, doorProgress }),
      'body{background:#d9e2dc}.mailbox-art{width:224px;height:308px;margin:30px 80px;overflow:visible}',
    );
    await page.screenshot({ path: `${out}/door-${doorProgress}.png` });
  }
  assert.deepEqual(errors, []);
  console.log(
    `Passed ${checked} rendered frames: aperture occlusion, complete exterior envelopes, closed coverage, both routes, day/night, 1280/900/390px viewports. Door poses saved for visual review.`,
  );
} finally {
  await browser.close();
  server.close();
}
