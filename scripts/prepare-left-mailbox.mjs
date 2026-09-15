// Mechanical atlas registration: no freehand artwork is synthesized here.
import sharp from 'sharp';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const source = process.argv[2];
if (!source) throw new Error('Supply the generated parts atlas.');
const out = 'public/world';
await mkdir('.local/art-source/left-parts', { recursive: true });
await copyFile(source, '.local/art-source/left-parts/source.png');
const colors = [
  '252238',
  '4b568e',
  '596fb0',
  '7891c5',
  'adc0d1',
  'bd4760',
  '814f5d',
  'a47179',
].map((c) => [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)));
async function part(crop, width, height) {
  const { data } = await sharp(source)
    .extract(crop)
    .resize(width, height, { fit: 'fill', kernel: 'nearest' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const rgb = [data[i], data[i + 1], data[i + 2]];
    if (Math.max(...rgb) - Math.min(...rgb) < 28 && Math.min(...rgb) > 145) {
      data.fill(0, i, i + 4);
      continue;
    }
    const color = colors.reduce(
      (best, c) =>
        c.reduce((s, v, k) => s + (v - rgb[k]) ** 2, 0) < best.d
          ? { c, d: c.reduce((s, v, k) => s + (v - rgb[k]) ** 2, 0) }
          : best,
      { c: colors[0], d: Infinity },
    ).c;
    data.set([...color, 255], i);
  }
  // Keep the actual part, discarding detached matte fragments.
  const seen = new Uint8Array(width * height),
    groups = [];
  const neighbors = (p) =>
    [
      p % width > 0 ? p - 1 : -1,
      p % width < width - 1 ? p + 1 : -1,
      p >= width ? p - width : -1,
      p < width * (height - 1) ? p + width : -1,
    ].filter((p) => p >= 0);
  for (let p = 0; p < seen.length; p++) {
    if (seen[p] || !data[p * 4 + 3]) continue;
    const group = [p];
    seen[p] = 1;
    for (let k = 0; k < group.length; k++)
      for (const q of neighbors(group[k]))
        if (!seen[q] && data[q * 4 + 3]) {
          seen[q] = 1;
          group.push(q);
        }
    groups.push(group);
  }
  const main = groups.sort((a, b) => b.length - a.length)[0] || [];
  seen.fill(0);
  for (const p of main) seen[p] = 1;
  for (let p = 0; p < seen.length; p++)
    if (!seen[p]) data.fill(0, p * 4, p * 4 + 4);
  // Flood the external matte; neutral holes inside metal keep their material.
  const external = new Uint8Array(width * height),
    queue = [];
  for (let p = 0; p < external.length; p++)
    if (
      !data[p * 4 + 3] &&
      (p < width ||
        p >= width * (height - 1) ||
        p % width === 0 ||
        p % width === width - 1)
    ) {
      external[p] = 1;
      queue.push(p);
    }
  for (let k = 0; k < queue.length; k++)
    for (const q of neighbors(queue[k]))
      if (!external[q] && !data[q * 4 + 3]) {
        external[q] = 1;
        queue.push(q);
      }
  for (let p = 0; p < external.length; p++)
    if (!external[p] && !data[p * 4 + 3]) {
      const donor = neighbors(p).find((q) => data[q * 4 + 3]);
      data.set(
        donor === undefined
          ? [173, 192, 209, 255]
          : data.subarray(donor * 4, donor * 4 + 4),
        p * 4,
      );
    }
  // A one-native-pixel contour contains all fill colors.
  const clean = Buffer.from(data);
  for (let p = 0; p < external.length; p++)
    if (
      data[p * 4 + 3] &&
      (neighbors(p).length < 4 || neighbors(p).some((q) => !data[q * 4 + 3]))
    )
      clean.set([37, 34, 56, 255], p * 4);
  return sharp(clean, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
const crop = (left, top, width, height) => ({ left, top, width, height });
const front = await part(crop(235, 45, 136, 377), 20, 62);
const side = await part(crop(371, 45, 459, 377), 84, 62);
const post = await part(crop(416, 376, 141, 214), 22, 48);
const closed = await part(crop(1098, 125, 166, 355), 22, 51);
const open = await part(crop(185, 605, 191, 360), 22, 47);
const up = await part(crop(675, 617, 198, 343), 26, 54);
const down = await part(crop(1063, 755, 322, 180), 44, 25);
// Derive the aperture from the actual dark interior, rather than an approximate
// rectangle. This mask is shared by stored mail and both animated entrances.
const frontPixels = await sharp(front).ensureAlpha().raw().toBuffer();
const cavity = [39 * 20 + 11],
  visited = new Set(cavity);
for (let i = 0; i < cavity.length; i++) {
  const p = cavity[i],
    x = p % 20,
    y = Math.floor(p / 20);
  for (const [nx, ny] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]) {
    const q = ny * 20 + nx;
    if (nx < 0 || nx >= 20 || ny < 0 || ny >= 62 || visited.has(q)) continue;
    if (frontPixels.readUInt32BE(q * 4) === 0x252238ff) {
      visited.add(q);
      cavity.push(q);
    }
  }
}
if (cavity.length < 100 || cavity.length > 450)
  throw new Error(
    'The interior must be a separate, bounded part of the sprite.',
  );
const xs = cavity.map((p) => (p % 20) + 4),
  ys = cavity.map((p) => Math.floor(p / 20) + 26);
const left = Math.min(...xs),
  right = Math.max(...xs) + 1,
  top = Math.min(...ys),
  bottom = Math.max(...ys) + 1;
let opening = '';
for (let y = top; y < bottom; y++) {
  let x = left;
  while (x < right) {
    if (!visited.has((y - 26) * 20 + x - 4)) {
      x++;
      continue;
    }
    const start = x;
    while (x < right && visited.has((y - 26) * 20 + x - 4)) x++;
    opening += `M${start} ${y}h${x - start}v1H${start}Z`;
  }
}
await writeFile(
  'lib/mailbox-geometry.ts',
  '// Generated from the actual interior pixels by prepare-left-mailbox.mjs.\nexport const mailboxGeometry = ' +
    JSON.stringify(
      { mouth: { left, right, top, bottom, centerY: bottom - 18 }, opening },
      null,
      2,
    ) +
    ' as const;\n',
);
for (const door of ['open', 'closed'])
  for (const flag of ['up', 'down']) {
    const parts = [
      { input: post, left: 38, top: 84 },
      { input: front, left: 4, top: 26 },
      { input: side, left: 24, top: 26 },
      {
        input: door === 'open' ? open : closed,
        left: 4,
        top: door === 'open' ? 85 : 37,
      },
      {
        input: flag === 'up' ? up : down,
        left: 52,
        top: flag === 'up' ? 9 : 49,
      },
    ];
    const sprite = await sharp({
      create: { width: 112, height: 134, channels: 4, background: '#00000000' },
    })
      .composite(parts)
      .png()
      .toBuffer();
    await writeFile(`${out}/mailbox-${door}-${flag}.png`, sprite);
  }
for (const [name, input] of Object.entries({
  front,
  side,
  post,
  closed,
  open,
  up,
  down,
}))
  await writeFile(`.local/art-source/left-parts/${name}.png`, input);
// Keep a clean continuous outline on distant shrubs without outlining grass.
const { data, info } = await sharp(await readFile(`${out}/landscape.png`))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let x = 0; x < info.width; x++) {
  let y = 0;
  while (y < info.height && !data[(y * info.width + x) * 4 + 3]) y++;
  const p = (y * info.width + x) * 4;
  if (y < info.height && (data[p + 2] > data[p + 1] - 25 || data[p] < 65))
    data.set([57, 70, 91, 255], p);
  // The open grassy ridge has no bush outline. Remove isolated cool edge
  // fragments there by extending the adjacent grass material upward.
  if (x >= 180 && x <= 460 && y < info.height) {
    for (let yy = y; yy < Math.min(y + 3, info.height); yy++) {
      const j = (yy * info.width + x) * 4;
      if (data[j + 2] < data[j + 1] - 25 && data[j] >= 65) continue;
      let donor = yy + 1;
      while (donor < info.height) {
        const k = (donor * info.width + x) * 4;
        if (data[k] >= 65 && data[k + 1] > data[k + 2] + 25) {
          data.writeUInt32BE(data.readUInt32BE(k), j);
          break;
        }
        donor++;
      }
    }
  }
}
await sharp(data, { raw: info }).png().toFile(`${out}/landscape.png`);
console.log(
  'Registered shared body, post, doors and pivot-aligned flag parts; cleaned solid pixel contours.',
);
