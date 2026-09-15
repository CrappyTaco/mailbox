// Production pixel art: integer coordinates, opaque palette entries, no resampling.
// The supplied sheets inform the designs; no source image is copied or cropped.
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export const SIZE = 40;
export const FRAMES = 16;
export const names = [
  'toffee',
  'squashy',
  'wilfred',
  'lady',
  'earl',
  'nibbler',
  'noddle',
];
const outline = '#393440';
const cream = '#f7efdf',
  creamShade = '#d8cdbe',
  ink = '#292531';
const coats = {
  toffee: ['#c79d70', '#e0bb8b', '#a67b58'],
  squashy: ['#35323c', '#4c4650', '#292731'],
  wilfred: ['#35323c', '#4c4650', '#292731'],
  lady: ['#999298', '#b7b0b2', '#77747f'],
  earl: ['#b7a99d', '#d1c6b6', '#8e837f'],
};
function canvas() {
  const pixels = Array(SIZE * SIZE).fill(null);
  const put = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) pixels[y * SIZE + x] = c;
  };
  const rect = (x, y, w, h, c) => {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) put(x + i, y + j, c);
  };
  const poly = (points, c) => {
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [a, b] = points[i],
            [d, e] = points[j];
          if (
            b > y + 0.5 !== e > y + 0.5 &&
            x + 0.5 < ((d - a) * (y + 0.5 - b)) / (e - b) + a
          )
            inside = !inside;
        }
        if (inside) put(x, y, c);
      }
  };
  const outlined = (pts, c) => {
    const mask = canvas();
    mask.poly(pts, c);
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++)
        if (mask.pixels[y * SIZE + x]) {
          put(x - 1, y, outline);
          put(x + 1, y, outline);
          put(x, y - 1, outline);
          put(x, y + 1, outline);
        }
    for (let i = 0; i < pixels.length; i++) if (mask.pixels[i]) pixels[i] = c;
  };
  return { pixels, put, rect, poly, outlined };
}
function rabbit(id, frame) {
  const c = canvas(),
    [base, light, shade] = coats[id];
  const loaf = [8, 9, 13].includes(frame),
    eat = frame === 2 || frame === 3,
    leap = frame === 6;
  const squat = frame === 4 || frame === 7 || loaf;
  const y = leap ? -1 : squat ? 2 : 0,
    headY = y + (eat ? 4 : frame === 11 ? -1 : 0),
    headX = eat ? 2 : frame === 11 ? -1 : 0;
  const bodyTop = loaf ? 24 : 21,
    bodyRight = id === 'squashy' ? 29 : 28;
  const shape = [
    [9, bodyTop + 3 + y],
    [13, bodyTop + y],
    [22, bodyTop + y],
    [bodyRight, 25 + y],
    [30, 31 + y],
    [27, 35 + y],
    [10, 35 + y],
    [7, 32 + y],
    [7, 27 + y],
  ];
  c.outlined(
    [
      [5, 28 + y],
      [9, 27 + y],
      [10, 31 + y],
      [7, 33 + y],
      [4, 31 + y],
    ],
    id === 'lady' ? light : cream,
  );
  c.outlined(shape, base);
  c.poly(
    [
      [10, 25 + y],
      [15, 22 + y],
      [22, 22 + y],
      [25, 25 + y],
      [13, 25 + y],
      [10, 30 + y],
    ],
    light,
  );
  c.poly(
    [
      [10, 31 + y],
      [15, 32 + y],
      [20, 29 + y],
      [24, 30 + y],
      [28, 29 + y],
      [27, 34 + y],
      [12, 34 + y],
    ],
    shade,
  );
  // Markings are attached to the same body coordinates in every pose.
  if (id === 'squashy')
    c.poly(
      [
        [23, 23 + y],
        [28, 25 + y],
        [29, 33 + y],
        [26, 35 + y],
        [20, 35 + y],
        [18, 31 + y],
        [19, 27 + y],
      ],
      cream,
    );
  if (id === 'wilfred') {
    c.poly(
      [
        [17, 24 + y],
        [26, 24 + y],
        [29, 29 + y],
        [27, 35 + y],
        [11, 35 + y],
        [9, 31 + y],
        [13, 28 + y],
      ],
      cream,
    );
    c.poly(
      [
        [12, 25 + y],
        [16, 25 + y],
        [16, 28 + y],
        [14, 29 + y],
        [11, 28 + y],
      ],
      base,
    );
    c.rect(19, 26 + y, 2, 3, base);
    c.rect(11, 31 + y, 3, 2, base);
    c.rect(23, 32 + y, 2, 2, base);
  }
  if (id === 'earl') {
    c.poly(
      [
        [17, 22 + y],
        [23, 23 + y],
        [26, 28 + y],
        [29, 30 + y],
        [27, 35 + y],
        [11, 35 + y],
        [10, 31 + y],
        [16, 30 + y],
        [18, 26 + y],
      ],
      cream,
    );
    c.poly(
      [
        [11, 26 + y],
        [15, 25 + y],
        [16, 28 + y],
        [14, 31 + y],
        [10, 30 + y],
      ],
      shade,
    );
  }
  if (id === 'toffee' || id === 'lady')
    c.poly(
      [
        [25, 27 + y],
        [29, 29 + y],
        [27, 35 + y],
        [22, 35 + y],
        [21, 32 + y],
      ],
      id === 'toffee' ? '#e8cba3' : '#d0c8c4',
    );
  // Planted feet keep the landing silhouette stable; the airborne pose stretches them.
  if (!loaf) {
    const foot = id === 'toffee' ? light : id === 'lady' ? '#c6beba' : cream;
    c.outlined(
      [
        [10, 32 + y],
        [15, 32 + y],
        [leap ? 13 : 18, 35 + y],
        [leap ? 8 : 10, 35 + y],
      ],
      foot,
    );
    c.outlined(
      [
        [24, 31 + y],
        [27, 31 + y],
        [leap ? 34 : 30, 35 + y],
        [leap ? 31 : 24, 35 + y],
      ],
      foot,
    );
  } else
    c.rect(
      14,
      34 + y,
      13,
      1,
      id === 'squashy' || id === 'wilfred' || id === 'earl' ? cream : light,
    );
  const hx = 23 + headX,
    hy = 23 + headY;
  const head = [
    [hx - 6, hy - 5],
    [hx - 3, hy - 8],
    [hx + 4, hy - 8],
    [hx + 8, hy - 4],
    [hx + 9, hy + 1],
    [hx + 6, hy + 5],
    [hx, hy + 6],
    [hx - 6, hy + 3],
    [hx - 8, hy - 1],
  ];
  c.outlined(head, base);
  c.poly(
    [
      [hx - 5, hy - 4],
      [hx - 2, hy - 7],
      [hx + 3, hy - 7],
      [hx + 5, hy - 5],
      [hx - 1, hy - 4],
    ],
    light,
  );
  if (id === 'toffee' || id === 'lady')
    c.poly(
      [
        [hx + 4, hy],
        [hx + 8, hy],
        [hx + 7, hy + 4],
        [hx + 2, hy + 5],
        [hx - 1, hy + 3],
      ],
      id === 'toffee' ? '#edd2aa' : '#ddd2c5',
    );
  if (id === 'earl') {
    c.poly(
      [
        [hx - 2, hy - 7],
        [hx + 1, hy - 7],
        [hx + 2, hy - 3],
        [hx + 3, hy - 1],
        [hx + 1, hy + 1],
        [hx - 1, hy - 2],
      ],
      cream,
    );
    c.poly(
      [
        [hx - 3, hy + 1],
        [hx + 5, hy - 1],
        [hx + 8, hy + 2],
        [hx + 5, hy + 5],
        [hx - 1, hy + 4],
      ],
      '#777078',
    );
    c.rect(hx - 4, hy + 2, 2, 2, cream);
    c.rect(hx + 6, hy + 3, 2, 1, cream);
  }
  if (id === 'squashy' || id === 'wilfred') {
    c.rect(hx + 3, hy - 7, 1, 2, cream);
    c.rect(hx + 4, hy - 5, 1, 1, cream);
    if (id === 'squashy') c.rect(hx + 6, hy + 2, 3, 2, cream);
  }
  if (id === 'squashy')
    c.poly(
      [
        [hx - 6, hy],
        [hx - 4, hy + 3],
        [hx + 2, hy + 5],
        [hx + 5, hy + 4],
        [hx + 4, Math.min(hy + 9, 35 + y)],
        [hx - 3, Math.min(hy + 10, 35 + y)],
        [hx - 6, hy + 6],
      ],
      cream,
    );
  // Ears are layered from a fixed model. Toffee always keeps the hooked tip.
  if (id === 'lady' || id === 'earl') {
    const flick = frame === 10 || frame === 14;
    c.outlined(
      [
        [hx - 5, hy - 5],
        [hx - 7, hy - 3],
        [hx - 9, hy + 4],
        [hx - 8, hy + 8],
        [hx - 5, hy + 8],
        [hx - 3, hy + 3],
        [hx - 2, hy - 3],
      ],
      shade,
    );
    c.poly(
      [
        [hx - 5, hy - 3],
        [hx - 6, hy + 3],
        [hx - 7, hy + 6],
        [hx - 5, hy + 6],
        [hx - 3, hy],
      ],
      base,
    );
    c.outlined(
      [
        [hx + 5, hy - 5],
        [hx + 7, hy - 3],
        [hx + (flick ? 10 : 9), hy + 4],
        [hx + 8, hy + 6],
        [hx + 6, hy + 4],
      ],
      shade,
    );
  } else {
    const tall = id === 'wilfred' ? 1 : 0,
      twitch = frame === 10 || frame === 12 ? 1 : 0;
    c.outlined(
      [
        [hx - 5, hy - 6],
        [hx - 8, hy - 13 - tall - twitch],
        [hx - 8, hy - 18 - tall - twitch],
        [hx - 6, hy - 18 - tall - twitch],
        [hx - 2, hy - 12],
        [hx - 1, hy - 6],
      ],
      base,
    );
    c.poly(
      [
        [hx - 6, hy - 15 - tall],
        [hx - 4, hy - 11],
        [hx - 3, hy - 7],
        [hx - 5, hy - 9],
      ],
      '#a77d79',
    );
    if (id === 'toffee') {
      c.outlined(
        [
          [hx, hy - 6],
          [hx + 1, hy - 14],
          [hx, hy - 17],
          [hx + 1, hy - 19],
          [hx + 5, hy - 17],
          [hx + 6, hy - 13],
          [hx + 4, hy - 12],
          [hx + 3, hy - 6],
        ],
        base,
      );
      c.rect(hx + 1, hy - 17, 2, 3, light);
      c.rect(hx + 2, hy - 15, 2, 2, '#ecd0a6');
    } else {
      c.outlined(
        [
          [hx, hy - 6],
          [hx, hy - 13],
          [hx + 2, hy - 19 - tall - twitch],
          [hx + 4, hy - 19 - tall - twitch],
          [hx + 5, hy - 15],
          [hx + 3, hy - 6],
        ],
        base,
      );
      c.poly(
        [
          [hx + 2, hy - 15],
          [hx + 3, hy - 17],
          [hx + 3, hy - 11],
          [hx + 1, hy - 8],
        ],
        '#a77d79',
      );
    }
  }
  const ex = hx + 4,
    ey = hy - 2;
  if (frame === 11) {
    c.rect(ex - 2, ey - 1, 2, 3, ink);
    c.put(ex - 2, ey - 1, cream);
    c.rect(hx - 3, ey - 1, 2, 2, ink);
    c.put(hx - 3, ey - 1, cream);
    if (id === 'earl') c.rect(ex - 3, ey - 2, 3, 1, shade);
  } else if (frame === 9 || frame === 1 || frame === 13)
    c.rect(ex - 1, ey, 3, 1, ink);
  else {
    c.rect(ex, ey - 1, 2, 3, ink);
    c.put(ex, ey - 1, cream);
  }
  c.put(
    hx + (frame === 11 ? 2 : 8) + (frame === 15 ? 1 : 0),
    hy + 2,
    '#bc8b88',
  );
  c.rect(hx + 6, hy + 4, 2, 1, shade);
  if (eat) {
    c.rect(hx + 7, hy + 5, 3, 1, '#789358');
    if (frame === 3) c.rect(hx + 8, hy + 4, 1, 3, '#a6b972');
  }
  return c.pixels;
}
function bird(id, frame) {
  const c = canvas(),
    yellow = id === 'nibbler',
    face = yellow ? '#f1d77c' : cream,
    faceHi = yellow ? '#fff0a8' : '#fff7e9';
  const flight = [4, 5, 6, 7].includes(frame),
    peck = frame === 2 || frame === 3,
    puff = frame === 13;
  const y = flight ? -2 : 0,
    hy = peck ? 5 : 0;
  c.outlined(
    [
      [9, 28 + y],
      [16, 28 + y],
      [12, 34 + y],
      [5, 35 + y],
    ],
    '#777781',
  );
  c.rect(8, 32 + y, 4, 1, creamShade);
  c.outlined(
    [
      [16, 18 + y],
      [24, 18 + y],
      [28 + (puff ? 2 : 0), 25 + y],
      [26, 32 + y],
      [18, 34 + y],
      [12 - (puff ? 1 : 0), 30 + y],
      [13, 23 + y],
    ],
    '#969198',
  );
  c.poly(
    [
      [18, 20 + y],
      [23, 20 + y],
      [26, 25 + y],
      [23, 28 + y],
      [18, 27 + y],
    ],
    '#b2abb0',
  );
  c.poly(
    [
      [15, 28 + y],
      [20, 31 + y],
      [26, 28 + y],
      [25, 32 + y],
      [18, 33 + y],
    ],
    '#7e7a86',
  );
  if (flight) {
    const up = frame === 4 || frame === 6;
    c.outlined(
      up
        ? [
            [16, 24 + y],
            [9, 15 + y],
            [7, 9 + y],
            [12, 12 + y],
            [18, 20 + y],
            [21, 25 + y],
          ]
        : [
            [16, 24 + y],
            [9, 28 + y],
            [6, 31 + y],
            [13, 31 + y],
            [21, 27 + y],
          ],
      '#8a858f',
    );
    c.poly(
      up
        ? [
            [10, 14 + y],
            [13, 16 + y],
            [18, 24 + y],
            [15, 22 + y],
          ]
        : [
            [9, 29 + y],
            [16, 27 + y],
            [18, 28 + y],
            [12, 30 + y],
          ],
      cream,
    );
  } else {
    c.outlined(
      [
        [16, 22 + y],
        [21, 20 + y],
        [22, 25 + y],
        [18, 29 + y],
        [11, 30 + y],
      ],
      '#777781',
    );
    c.poly(
      [
        [18, 22 + y],
        [20, 21 + y],
        [20, 25 + y],
        [16, 28 + y],
        [12, 29 + y],
        [16, 25 + y],
      ],
      cream,
    );
  }
  const hx = 25,
    headY = 16 + hy + y;
  c.outlined(
    [
      [hx - 5, headY - 3],
      [hx - 2, headY - 5],
      [hx + 3, headY - 5],
      [hx + 6, headY - 2],
      [hx + 6, headY + 3],
      [hx + 3, headY + 6],
      [hx - 3, headY + 4],
      [hx - 5, headY + 1],
    ],
    face,
  );
  c.poly(
    [
      [hx - 3, headY - 3],
      [hx + 1, headY - 4],
      [hx + 3, headY - 2],
      [hx - 1, headY],
    ],
    faceHi,
  );
  const crest = frame === 10 || frame === 12 || puff;
  c.poly(
    [
      [hx - 2, headY - 4],
      [hx - 7, headY - 8],
      [hx - 10, headY - (crest ? 15 : 12)],
      [hx - 8, headY - (crest ? 13 : 9)],
      [hx - 5, headY - 8],
      [hx - 6, headY - (crest ? 14 : 9)],
      [hx - 3, headY - 7],
      [hx + 1, headY - 4],
    ],
    outline,
  );
  c.poly(
    [
      [hx - 2, headY - 4],
      [hx - 7, headY - 9],
      [hx - 8, headY - 10],
      [hx - 5, headY - 9],
      [hx - 2, headY - 6],
      [hx - 4, headY - 10],
      [hx, headY - 6],
    ],
    face,
  );
  c.rect(hx - 5, headY - 8, 2, 2, face);
  c.rect(hx - 3, headY - 6, 3, 2, face);
  c.rect(hx - 1, headY - 5, 3, 2, face);
  if (yellow) {
    c.rect(hx - 2, headY + 1, 3, 3, '#e79b62');
    c.rect(hx - 1, headY + 1, 2, 2, '#f8ae64');
  }
  const ey = headY;
  if (frame === 9 || frame === 1) c.rect(hx + 2, ey, 3, 1, ink);
  else if (!yellow) {
    c.rect(hx + 1, ey - 1, 4, 1, ink);
    c.rect(hx + (frame === 11 ? 1 : 2), ey, frame === 11 ? 1 : 2, 1, ink);
    if (puff) c.put(hx + 1, ey - 2, ink);
  } else {
    c.rect(hx + (frame === 11 ? 0 : 2), ey - 1, 2, 2, ink);
    c.put(hx + (frame === 11 ? 0 : 2), ey - 1, cream);
  }
  c.outlined(
    [
      [hx + 6, headY + 1],
      [hx + 7, headY + 2],
      [hx + 6, headY + 5],
      [hx + 4, headY + 3],
    ],
    '#b2a196',
  );
  if (!flight) {
    c.rect(18, 34, 1, 2, '#a88e83');
    c.rect(22, 34, 1, 2, '#a88e83');
    c.rect(17, 36, 4, 1, outline);
    c.rect(22, 36, 4, 1, outline);
  }
  return c.pixels;
}
export function spriteFrame(id, frame) {
  return id === 'nibbler' || id === 'noddle'
    ? bird(id, frame)
    : rabbit(id, frame);
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const b of body) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  const size = Buffer.alloc(4),
    sum = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  sum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, body, sum]);
}
export function png(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const hex = pixels[y * width + x];
      if (!hex) continue;
      const i = y * (width * 4 + 1) + 1 + x * 4;
      raw[i] = parseInt(hex.slice(1, 3), 16);
      raw[i + 1] = parseInt(hex.slice(3, 5), 16);
      raw[i + 2] = parseInt(hex.slice(5, 7), 16);
      raw[i + 3] = 255;
    }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width);
  head.writeUInt32BE(height, 4);
  head[8] = 8;
  head[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
export async function buildSprites() {
  await mkdir('public/animals', { recursive: true });
  for (const id of names) {
    const pixels = Array(SIZE * FRAMES * SIZE).fill(null);
    for (let f = 0; f < FRAMES; f++) {
      const frame = spriteFrame(id, f);
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
          pixels[y * SIZE * FRAMES + f * SIZE + x] = frame[y * SIZE + x];
    }
    await writeFile(
      `public/animals/${id}.png`,
      png(SIZE * FRAMES, SIZE, pixels),
    );
  }
  console.log(
    'Built seven transparent 640 × 40 pixel sprite sheets (16 frames each).',
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await buildSprites();
