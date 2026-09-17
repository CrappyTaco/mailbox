// Visual regression: hiding physical mailbox parts must reveal a whole letter.
// Uses production geometry and retrieval CSS, with no mail API or private data.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { Mailbox } from '../components/mailbox/Mailbox.tsx';
import { MAILBOX_ART, mailboxPassagePath } from '../lib/world-style.ts';

const out = '.local/envelope-integrity';
await mkdir(out, { recursive: true });
const assets = new Map(
  await Promise.all(
    ['interior', 'exterior', 'doors', 'flags', 'letter'].map(async (name) => [
      `/world/mailbox/${name}.png`,
      await readFile(`public/world/mailbox/${name}.png`),
    ]),
  ),
);
const server = createServer((request, response) => {
  const data = assets.get(request.url);
  response.writeHead(data ? 200 : 404, { 'Content-Type': 'image/png' });
  response.end(data);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage();
const css = await readFile('components/world/world-redesign.css', 'utf8');
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const restoreClip = process.argv.includes('--restore-clip');
let checked = 0;
try {
  for (const scale of [0.875, 1.5, 2.5]) {
    await page.setViewportSize({ width: 640, height: 500 });
    for (const flip of [false, true]) {
      for (let step = 0; step <= 8; step++) {
        // Explicit positions cover insertion and extraction; CSS cases exercise
        // the separate main-scene retrieval animation and its final held pose.
        for (const retrieving of [false, true]) {
          const letterX = retrieving
            ? MAILBOX_ART.stored.x
            : MAILBOX_ART.stored.x +
              ((MAILBOX_ART.exitX - MAILBOX_ART.stored.x) * step) / 8;
          const html = renderToStaticMarkup(
            createElement(Mailbox, {
              mail: true,
              doorProgress: step / 8,
              letterX,
              letterFlipY: flip,
              retrieving,
            }),
          );
          await page.setContent(
            `<base href="http://127.0.0.1:${server.address().port}"><style>
              ${css}
              body{margin:0;background:#000}
              .mailbox-art{width:${112 * scale}px;height:${154 * scale}px;margin:30px 0 0 180px}
              .mailbox-interior,.mailbox-shell,.mailbox-hinged-door,.mailbox-pivot-flag{visibility:hidden}
              .mailbox-letter image{filter:brightness(0) invert(1)}
            </style>${html}`,
          );
          await page.evaluate(
            async ({ time, restoreClip, passage }) => {
              await Promise.all(
                [...document.querySelectorAll('image')].map(async (node) => {
                  const image = new Image();
                  image.src = node.getAttribute('href');
                  await image.decode();
                }),
              );
              for (const animation of document.getAnimations()) {
                animation.pause();
                animation.currentTime = time;
              }
              // Negative control reproduces the exact redundant clip removed by
              // this fix. The regression must fail even when foreground is hidden.
              if (restoreClip) {
                const svg = document.querySelector('.mailbox-art');
                const ns = 'http://www.w3.org/2000/svg';
                const clip = document.createElementNS(ns, 'clipPath');
                clip.id = 'regression-passage';
                clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
                const path = document.createElementNS(ns, 'path');
                path.setAttribute('d', passage);
                clip.append(path);
                svg.prepend(clip);
                const envelope = document.querySelector('.mailbox-letter');
                const wrapper = document.createElementNS(ns, 'g');
                wrapper.setAttribute('clip-path', 'url(#regression-passage)');
                envelope.before(wrapper);
                wrapper.append(envelope);
              }
            },
            {
              time: 560 + (450 * step) / 8,
              restoreClip,
              passage: mailboxPassagePath(),
            },
          );
          const bounds = await page
            .locator('.mailbox-letter image')
            .boundingBox();
          assert.ok(bounds && bounds.width > 0 && bounds.height > 0);
          const png = await page.screenshot();
          const { data, info } = await sharp(png)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          let missing = 0;
          // Ignore only the one-pixel raster boundary; every interior pixel of
          // this opaque rectangular source must remain visible under the wall.
          for (
            let y = Math.ceil(bounds.y) + 1;
            y < Math.floor(bounds.y + bounds.height) - 1;
            y++
          ) {
            for (
              let x = Math.ceil(bounds.x) + 1;
              x < Math.floor(bounds.x + bounds.width) - 1;
              x++
            ) {
              const i = (y * info.width + x) * 4;
              if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250)
                missing++;
            }
          }
          if (missing) await sharp(png).toFile(`${out}/incomplete.png`);
          assert.equal(
            missing,
            0,
            `missing envelope pixels: scale=${scale}, flip=${flip}, step=${step}, retrieving=${retrieving}`,
          );
          checked++;
        }
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    `Passed ${checked} full-object renders: all door poses, local transit, CSS retrieval, both orientations, three scales.`,
  );
} finally {
  await browser.close();
  server.close();
}
