// Read the supplied image; emit lossless SVG masks, never repaint its pixels.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const { data, info } = await sharp('public/world/reference/target.png')
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const pixel = (x, y) => [
  ...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3),
];
const clean = await sharp('public/world/reference/target-clean.png')
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const groundPixel = (x, y) => {
  const i = (y * clean.info.width + x) * 3;
  return [...clean.data.subarray(i, i + 3)];
};
const clouds = [
  [272, 171, 211, 106],
  [1376, 179, 291, 144],
  [140, 321, 151, 73],
  [657, 297, 111, 59],
  [1300, 323, 92, 46],
  [1481, 429, 92, 44],
];
function pathFor(box, contains) {
  const [x, y, w, h] = box,
    runs = [];
  for (let py = y; py < y + h; py++) {
    let start = -1;
    for (let px = x; px <= x + w; px++) {
      const on = px < x + w && contains(px, py);
      if (on && start < 0) start = px;
      if (!on && start >= 0) {
        runs.push([start, py, px - start, 1]);
        start = -1;
      }
    }
  }
  const merged = [];
  for (const run of runs) {
    const prev = merged.at(-1);
    if (
      prev &&
      prev[0] === run[0] &&
      prev[2] === run[2] &&
      prev[1] + prev[3] === run[1]
    )
      prev[3]++;
    else merged.push(run);
  }
  return merged.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}H${x}Z`).join('');
}
const inBox = (x, y, [bx, by, w, h]) =>
  x >= bx && x < bx + w && y >= by && y < by + h;
// Retain the connected cloud, excluding stars that share its rectangular crop.
const cloudPixels = clouds.map(([x, y, w, h]) => {
  const remaining = new Set();
  for (let row = 0; row < h; row++)
    for (let col = 0; col < w; col++) {
      const [r, g, b] = pixel(x + col, y + row);
      if (r > 53 || (r < 36 && g < 46 && b < 82)) remaining.add(row * w + col);
    }
  let largest = [];
  while (remaining.size) {
    const queue = [remaining.values().next().value];
    remaining.delete(queue[0]);
    for (let i = 0; i < queue.length; i++) {
      const px = queue[i] % w,
        py = Math.floor(queue[i] / w);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx,
            ny = py + dy,
            n = ny * w + nx;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && remaining.delete(n))
            queue.push(n);
        }
    }
    if (queue.length > largest.length) largest = queue;
  }
  return new Set(largest);
});
const inCloud = (x, y, i) => {
  const [bx, by, w] = clouds[i];
  return inBox(x, y, clouds[i]) && cloudPixels[i].has((y - by) * w + x - bx);
};
const cloudPaths = clouds.map((box, i) =>
  pathFor(box, (x, y) => inCloud(x, y, i)),
);
const excluded = [
  [47, 37, 246, 33],
  [550, 203, 111, 107],
  [753, 429, 229, 292],
  [1518, 752, 245, 97],
];
const stars = pathFor(
  [0, 0, 1786, 430],
  (x, y) =>
    !excluded.some((b) => inBox(x, y, b)) &&
    !clouds.some((_, i) => inCloud(x, y, i)) &&
    pixel(x, y).every((c) => c > 130),
);
const title = pathFor([47, 37, 246, 33], (x, y) => {
  const [r, g, b] = pixel(x, y);
  return (r > 155 && g > 155 && b > 155) || (r > 120 && r > g * 1.25);
});
const moon = pathFor([550, 203, 111, 107], (x, y) => pixel(x, y)[0] > 120);
const horizon = [];
for (let x = 0; x < 1786; x++) {
  let y = 330;
  while (y < 600) {
    const [r, g, b] = groundPixel(x, y);
    if (g >= 72 && b >= 96 && r < 90) break;
    y++;
  }
  horizon.push(y);
}
let terrain = 'M0 880V' + horizon[0];
for (let x = 1; x < 1786; x++)
  if (horizon[x] !== horizon[x - 1]) terrain += `H${x}V${horizon[x]}`;
terrain += 'H1786V880Z';
const masks = {
  width: 1786,
  height: 880,
  clouds: cloudPaths,
  cloudBounds: clouds,
  stars,
  title,
  moon,
  terrain,
};
await writeFile(
  'lib/target-masks.ts',
  `// Generated from the user-supplied target.png by scripts/build-target-masks.mjs.\nexport const TARGET_MASKS = ${JSON.stringify(masks, null, 2)} as const;\n`,
);
console.log(
  'Traced target cloud silhouettes, stars, moon, title and landscape edge.',
);
