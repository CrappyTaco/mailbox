import { readFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mailbox } from '../components/mailbox/Mailbox.tsx';
import { Envelope } from '../components/world/PixelArt.tsx';
const out = '.local/art-source';
await mkdir(out, { recursive: true });
async function render(element) {
  let source = renderToStaticMarkup(element);
  source = source
    .replaceAll('var(--reference-night, 0)', '0')
    .replace(/var\(--[\w-]+,\s*(#[0-9a-fA-F]{6})\)/g, '$1');
  for (const match of source.matchAll(/href="(\/world\/[^"]+)"/g))
    source = source.replace(
      match[0],
      `href="data:image/png;base64,${(await readFile('public' + match[1])).toString('base64')}"`,
    );
  return sharp(Buffer.from(source)).png().toBuffer();
}
const states = [
  { mail: true, door: 'closed' },
  { mail: true, door: 'open' },
  { mail: false, door: 'closed' },
  { mail: false, door: 'open' },
];
const layers = [];
for (let i = 0; i < states.length; i++)
  layers.push({
    input: await sharp(await render(createElement(Mailbox, states[i])))
      .resize(336, 402, { kernel: 'nearest' })
      .toBuffer(),
    left: i * 352,
    top: 8,
  });
await sharp({
  create: { width: 1408, height: 420, channels: 4, background: '#d9dfd7' },
})
  .composite(layers)
  .png()
  .toFile(`${out}/mailbox-component-review.png`);
await sharp(await render(createElement(Envelope, { width: 160, height: 88 })))
  .resize(640, 352, { kernel: 'nearest' })
  .png()
  .toFile(`${out}/envelope-component-review.png`);
console.log(
  'Rendered the actual shared mailbox and envelope components for art review.',
);
