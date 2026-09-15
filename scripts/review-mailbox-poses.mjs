// Static production components, rendered by Chromium; no mailbox API calls.
import { chromium } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir } from 'node:fs/promises';
import { Mailbox } from '../components/mailbox/Mailbox.tsx';
import { worldMaterials } from '../lib/world-materials.ts';
const out = '.local/mailbox-polish';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({
    viewport: { width: 1700, height: 780 },
  });
  /** @type {Array<[string, import('react').ComponentProps<typeof Mailbox>]>} */
  const poses = [
    ['Closed / empty', { door: 'closed', mail: false }],
    ['Closed / mail', { door: 'closed', mail: true }],
    ['Open / empty', { door: 'open', mail: false }],
    ['Open / letter', { door: 'open', mail: true }],
    ['Mid swing', { doorProgress: 0.6, flagProgress: 0.5, showLetter: false }],
  ];
  let html = '';
  for (const night of [0, 1])
    for (const [title, props] of poses) {
      const style = Object.entries({
        ...worldMaterials(night * 0.9),
        '--reference-night': night,
      })
        .map(([key, value]) => `${key}:${value}`)
        .join(';');
      html += `<article style="${style};background:${night ? '#202e43' : '#d6e4de'};color:${night ? '#d6e4de' : '#293044'}"><p>${night ? 'Night' : 'Day'} · ${title}</p>${renderToStaticMarkup(createElement(Mailbox, props))}</article>`;
    }
  await page.setContent(
    `<base href="http://127.0.0.1:3100"><style>body{margin:0;display:grid;grid-template-columns:repeat(5,340px);font:16px monospace}article{height:390px;overflow:hidden}p{margin:20px}.mailbox-art{width:224px;height:308px;margin-left:88px;overflow:visible}image{image-rendering:pixelated}</style>${html}`,
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
  await page.screenshot({ path: `${out}/mailbox-states.png` });
  console.log('Rendered ten shared mailbox poses in both lighting palettes.');
} finally {
  await browser.close();
}
