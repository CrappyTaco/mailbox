// Bake the existing closed stationery artwork; never crop a mailbox scene.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import {
  EnvelopeBack,
  EnvelopeFront,
  EnvelopeFlap,
  ENVELOPE_ART,
} from '../components/letter/EnvelopeArt.tsx';

export async function envelopeSprite() {
  const svg = renderToStaticMarkup(
    createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: ENVELOPE_ART.width,
        height: ENVELOPE_ART.height,
        viewBox: ENVELOPE_ART.viewBox,
        shapeRendering: 'crispEdges',
      },
      createElement(EnvelopeBack),
      createElement(EnvelopeFront),
      createElement(EnvelopeFlap),
    ),
  );
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function writeEnvelopeSprite(
  path = 'public/world/mailbox/letter.png',
) {
  await writeFile(path, await envelopeSprite());
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await writeEnvelopeSprite();
  console.log(
    'Authored complete mailbox envelope from shared stationery artwork.',
  );
}
