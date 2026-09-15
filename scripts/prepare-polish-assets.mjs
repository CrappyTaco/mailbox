// Register atlas frames, remove the neutral matte and quantize to opaque pixels.
import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [atlas, landscape] = process.argv.slice(2);
if (!atlas || !landscape)
  throw new Error('Supply atlas and landscape source PNGs.');
await mkdir('.local/art-source/polish', { recursive: true });
await copyFile(atlas, '.local/art-source/polish/atlas-source.png');
await copyFile(landscape, '.local/art-source/polish/landscape-source.png');
const out = resolve('public/world');
const palette = [
  '252238',
  '39465b',
  '4b568e',
  '596fb0',
  '7891c5',
  'adc0d1',
  'd6d9df',
  'bd4760',
  '814f5d',
  'a47179',
  '526449',
  '65785a',
  '809866',
  'adc08b',
  '829896',
  '9dada0',
  'f4e9ce',
  'd1b598',
  'e3b859',
];
const sunPalette = ['e8a52d', 'ffd257', 'ffe596', 'fff4d0'];
const mailboxPalette = palette.slice(0, 10);
async function reduce(input, w, h, colors = palette) {
  const { data, info } = await sharp(input)
    .resize(w, h, { kernel: 'nearest', fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgb = colors.map((c) =>
    [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)),
  );
  for (let i = 0; i < data.length; i += 4) {
    const sample = [data[i], data[i + 1], data[i + 2]];
    // Only the neutral checker matte is removed; blue/cool vegetation is retained.
    if (
      data[i + 3] < 180 ||
      (Math.max(...sample) - Math.min(...sample) < 20 &&
        Math.min(...sample) > 160)
    ) {
      data.fill(0, i, i + 4);
      continue;
    }
    let best = rgb[0],
      distance = Infinity;
    for (const color of rgb) {
      const d = color.reduce((v, c, k) => v + (c - sample[k]) ** 2, 0);
      if (d < distance) {
        distance = d;
        best = color;
      }
    }
    data.set([...best, 255], i);
  }
  // A single majority pass removes lone quantization specks, without blur.
  const cleaned = Buffer.from(data);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] === 0) continue;
      const neighbors = new Map();
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        const j = ((y + dy) * w + x + dx) * 4;
        if (!data[j + 3]) continue;
        const key = data.readUInt32BE(j);
        neighbors.set(key, (neighbors.get(key) || 0) + 1);
      }
      if ((neighbors.get(data.readUInt32BE(i)) || 0) > 1) continue;
      const best = [...neighbors].sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] >= 5) cleaned.writeUInt32BE(best[0], i);
    }
  return sharp(cleaned, { raw: info }).png().toBuffer();
}
const crop = (left, top, width, height) =>
  sharp(atlas).extract({ left, top, width, height }).png().toBuffer();
// Metal highlights must stay opaque: neutral source pixels are not holes.
async function closeInteriorHoles(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const exterior = new Uint8Array(width * height),
    queue = [];
  const visit = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (exterior[p] || data[p * 4 + 3]) return;
    exterior[p] = 1;
    queue.push(p);
  };
  for (let x = 0; x < width; x++) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    visit(0, y);
    visit(width - 1, y);
  }
  for (let k = 0; k < queue.length; k++) {
    const x = queue[k] % width,
      y = Math.floor(queue[k] / width);
    visit(x - 1, y);
    visit(x + 1, y);
    visit(x, y - 1);
    visit(x, y + 1);
  }
  for (let p = 0; p < exterior.length; p++) {
    if (exterior[p] || data[p * 4 + 3]) continue;
    // Extend the nearest existing material color into an enclosed matte hole.
    const x = p % width,
      y = Math.floor(p / width);
    let found = false;
    for (let r = 1; r < Math.max(width, height) && !found; r++) {
      for (const [dx, dy] of [
        [0, -r],
        [-r, 0],
        [r, 0],
        [0, r],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const j = (ny * width + nx) * 4;
        if (data[j + 3]) {
          data.writeUInt32BE(data.readUInt32BE(j), p * 4);
          found = true;
          break;
        }
      }
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
/** @typedef {[number,number,number,number]} Crop */
/** @type {Array<{name:string,body:Crop,split:number,door:Crop|null,flag:Crop|null}>} */
const frames = [
  {
    name: 'open-up',
    body: [65, 145, 370, 257],
    split: 140,
    door: [66, 386, 140, 155],
    flag: [245, 42, 101, 107],
  },
  {
    name: 'closed-up',
    body: [546, 145, 372, 257],
    split: 140,
    door: null,
    flag: [727, 42, 101, 107],
  },
  {
    name: 'open-down',
    body: [1030, 145, 367, 260],
    split: 135,
    door: [1032, 387, 138, 154],
    flag: null,
  },
  {
    name: 'closed-down',
    body: [61, 646, 372, 260],
    split: 141,
    door: null,
    flag: null,
  },
];
const post = await reduce(
  await crop(215, 389, 80, 141),
  23,
  36,
  mailboxPalette,
);
for (const frame of frames) {
  const [left, top, width, height] = frame.body;
  const front = await reduce(
    await crop(left, top, frame.split, height),
    30,
    68,
    mailboxPalette,
  );
  const side = await reduce(
    await crop(left + frame.split, top, width - frame.split, height),
    frame.flag ? 66 : 74,
    68,
    mailboxPalette,
  );
  const layers = [
    { input: post, left: 40, top: 96 },
    { input: front, left: 6, top: 30 },
    { input: side, left: 36, top: 30 },
  ];
  if (frame.door)
    layers.push({
      input: await reduce(await crop(...frame.door), 30, 39, mailboxPalette),
      left: 6,
      top: 95,
    });
  if (frame.flag)
    layers.push({
      input: await reduce(await crop(...frame.flag), 32, 29, mailboxPalette),
      left: 47,
      top: 1,
    });
  const sprite = await sharp({
    create: { width: 112, height: 134, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  await writeFile(
    resolve(out, `mailbox-${frame.name}.png`),
    await closeInteriorHoles(sprite),
  );
}
await writeFile(
  resolve(out, 'sun.png'),
  await reduce(await crop(540, 625, 370, 362), 48, 48, sunPalette),
);
await writeFile(
  resolve(out, 'flowers.png'),
  await reduce(await crop(997, 782, 231, 252), 32, 34),
);
const ground = await sharp(await reduce(landscape, 640, 360))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
// Close matte pinholes beneath the silhouette with the next solid ground pixel.
// The visible contour stays stepped; this does not blur or soften its edges.
for (let x = 0; x < 640; x++) {
  let top = 0;
  while (top < 360 && !ground.data[(top * 640 + x) * 4 + 3]) top++;
  let color = 0x526449ff;
  for (let y = 359; y >= top; y--) {
    const i = (y * 640 + x) * 4;
    if (ground.data[i + 3]) color = ground.data.readUInt32BE(i);
    else ground.data.writeUInt32BE(color, i);
  }
}
await sharp(ground.data, { raw: ground.info })
  .png()
  .toFile(resolve(out, 'landscape.png'));
console.log(
  'Prepared four mailbox states, sun, flower cluster and opaque landscape.',
);
