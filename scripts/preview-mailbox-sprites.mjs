// Isolated visual fixture: renders the production components without mail APIs.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { build } from 'vite';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mailbox } from '../components/mailbox/Mailbox.tsx';
import { MailboxShell } from '../components/mailbox/MailboxParts.tsx';
import { MAILBOX_SPRITES } from '../lib/mailbox-sprites.ts';
import { DeliveryScene } from '../components/letter/DeliveryScene.tsx';
import {
  deliveryFrame,
  FLIGHT_SECONDS,
  INSERT_SECONDS,
} from '../lib/delivery.ts';

const PORT = Number(process.argv[2] ?? 3188);
const reviewClient = await build({
  configFile: false,
  root: process.cwd(),
  publicDir: false,
  build: {
    write: false,
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: resolve('scripts/mailbox-review-client.tsx'),
      formats: ['es'],
      fileName: 'review',
    },
  },
  define: { 'process.env.NODE_ENV': '"development"' },
});
const styles = await Promise.all(
  ['world-style.css', 'world-redesign.css'].map((name) =>
    readFile('components/world/' + name, 'utf8'),
  ),
);
let sequence = 0;
function render(element) {
  return renderToStaticMarkup(element, {
    identifierPrefix: `review-${sequence++}-`,
  });
}
function mailbox(props, before = false) {
  const html = render(createElement(Mailbox, { showLetter: false, ...props }));
  return before ? html.replaceAll('/world/mailbox/', '/before/') : html;
}
function page(url) {
  const set = url.searchParams.get('set') ?? 'up';
  const detail = url.searchParams.has('detail');
  const mode = url.searchParams.get('mode') ?? 'night';
  const light = mode === 'day' ? 1.48 : 1;
  const showLetter = url.searchParams.has('letter');
  let cards = '';
  const card = (name, html) =>
    `<article><h2>${name}</h2><div class="art">${html}</div></article>`;
  if (set === 'hidden') {
    cards += card(
      'Flag hidden · door closed',
      mailbox({ flagVisible: false, doorProgress: 0 }),
    );
    cards += card(
      'Finished shell · no moving parts',
      render(
        createElement(
          'svg',
          {
            className: 'mailbox-art',
            viewBox: '0 0 112 154',
            overflow: 'visible',
          },
          createElement(MailboxShell),
        ),
      ),
    );
    cards += card(
      'Flag hidden · door fully open',
      mailbox({ flagVisible: false, doorProgress: 1 }),
    );
  } else if (set === 'motion') {
    cards =
      '<div id="motion-review"></div><script type="module" src="/review-client.js"></script>';
  } else if (set === 'journey') {
    cards =
      '<div id="motion-review" data-journey="true"></div><script type="module" src="/review-client.js"></script>';
  } else if (set === 'compare') {
    cards = [0, 0.5, 1]
      .flatMap((progress) =>
        [true, false].map((before) =>
          card(
            `${before ? 'Before' : 'After'} · door ${progress * 100}%`,
            mailbox(
              { doorProgress: progress, flagProgress: 1, showLetter },
              before,
            ),
          ),
        ),
      )
      .join('');
  } else if (set === 'delivery') {
    cards = [
      0,
      FLIGHT_SECONDS,
      FLIGHT_SECONDS + INSERT_SECONDS * 0.5,
      FLIGHT_SECONDS + INSERT_SECONDS,
      FLIGHT_SECONDS + INSERT_SECONDS + 0.7,
    ]
      .map((t) =>
        card(
          `Delivery ${t.toFixed(2)}s`,
          render(
            createElement(DeliveryScene, {
              frame: deliveryFrame(t, 0),
              recipient: 'indi',
              hour: 0,
            }),
          ),
        ),
      )
      .join('');
  } else {
    const frames = detail
      ? [Number(url.searchParams.get('detail'))]
      : [0, 0.1, 0.25, 0.375, 0.5, 0.625, 0.75, 0.9, 1];
    cards = frames
      .map((progress) =>
        card(
          `Door ${Math.round(progress * 100)}% · flag ${set}`,
          mailbox({
            doorProgress: progress,
            flagProgress: set === 'up' ? 1 : 0,
            mail: set === 'up',
            showLetter,
          }),
        ),
      )
      .join('');
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mailbox sprite review</title><style>${styles.join('\n')}
  *{box-sizing:border-box}body{margin:0;background:${mode === 'day' ? '#d9e2dc' : '#30445d'};color:${mode === 'day' ? '#22334c' : '#edf2f6'};font:14px system-ui;--reference-day-brightness:${light}}nav{padding:14px;display:flex;gap:20px}a{color:inherit}main{display:grid;grid-template-columns:repeat(${detail ? 1 : 5},300px);gap:8px;padding:8px}article{position:relative;width:300px;height:350px}h2{font-size:13px;font-weight:500;margin:8px 10px}.art{position:relative;padding-left:48px}.mailbox-art{width:224px;height:308px;overflow:visible;filter:none;image-rendering:pixelated}.mailbox-art image{image-rendering:pixelated}.detail article{width:650px;height:730px}.detail .art{padding-left:100px}.detail .mailbox-art{width:448px;height:616px}.delivery-stage{position:relative}.delivery-world{width:270px;height:290px}.space-stars{display:none}.delivery-stage p{display:none}
  main{grid-template-columns:repeat(${detail || set === 'motion' ? 1 : set === 'compare' ? 2 : 3},300px)}nav{flex-wrap:wrap}.controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:14px 0}.controls label{display:flex;gap:5px;align-items:center}.controls button,select{font:inherit;padding:5px}.motion-review main{display:block;max-width:1000px}.motion-art .mailbox-art{width:100%;height:100%}output{font-variant-numeric:tabular-nums}
  .journey-review{position:relative;height:min(78vh,720px);background:#252238}.journey-review .delivery-stage{position:absolute;inset:0;display:grid;place-content:center;justify-items:center}.journey-review .delivery-world{width:min(640px,96vw,68vh);height:auto;overflow:visible}.journey-review .mailbox-art{width:100%;height:100%}.journey-review text{fill:#f4e9ce;font:12px monospace}
  </style></head><body class="${detail ? 'detail' : ''} ${set === 'motion' || set === 'journey' ? 'motion-review' : ''}"><nav><a href="/?set=hidden&mode=${mode}">Flag hidden / shell</a><a href="/?set=up&mode=${mode}">Flag up</a><a href="/?set=down&mode=${mode}">Flag down</a><a href="/?set=${set}&mode=${mode === 'day' ? 'night' : 'day'}">Switch lighting</a><a href="/?set=delivery">Delivery poses</a><a href="/?set=journey">Interactive journey</a><a href="/?set=motion&mode=${mode}">Interactive motion</a><a href="/?set=compare&mode=${mode}">Before / after</a><a href="/?set=up&letter=1&mode=${mode}">Stored letter poses</a></nav><main>${cards}</main></body></html>`;
}
const allowed = new Set([
  MAILBOX_SPRITES.shell,
  MAILBOX_SPRITES.interior,
  MAILBOX_SPRITES.exterior,
  MAILBOX_SPRITES.doors,
  MAILBOX_SPRITES.flags,
  MAILBOX_SPRITES.letter,
  '/world/sun.png',
  '/world/moon.png',
  '/world/reference/target.png',
]);
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
    if (url.pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(page(url));
    } else if (url.pathname === '/review-client.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript' });
      const output = Array.isArray(reviewClient)
        ? reviewClient[0].output
        : reviewClient.output;
      response.end(output.find((file) => file.type === 'chunk').code);
    } else if (
      ['shell.png', 'doors.png', 'flags.png', 'letter.png'].some(
        (name) => url.pathname === '/before/' + name,
      )
    ) {
      response.writeHead(200, { 'Content-Type': 'image/png' });
      response.end(
        await readFile(
          '.local/mailbox-polish/before/assets/' +
            url.pathname.slice('/before/'.length),
        ),
      );
    } else if (allowed.has(url.pathname)) {
      response.writeHead(200, { 'Content-Type': 'image/png' });
      response.end(await readFile('public' + url.pathname));
    } else {
      response.writeHead(404);
      response.end();
    }
  } catch (error) {
    response.writeHead(500);
    response.end(String(error));
  }
});
server.listen(PORT, '127.0.0.1', () =>
  console.log(`Mailbox-only visual fixture: http://127.0.0.1:${PORT}`),
);
