// Offline sprite authoring. The browser only displays complete, registered PNG
// frames. No donor rectangles, runtime geometry deformation, or hinge overlay.
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import {
  MAILBOX_SPRITES,
  MAILBOX_SHELL,
  MAILBOX_DOOR_FACE,
} from '../lib/mailbox-sprites.ts';
import { MAILBOX_HINGE } from '../lib/mailbox-geometry.ts';

const out = 'public/world/mailbox';
await mkdir(out, { recursive: true });
const { width: W, height: H, frames: count } = MAILBOX_SPRITES;
const origin = { x: 748, y: 425 };
const reference = await sharp('public/world/reference/target.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const master = await sharp(out + '/shell-border-master.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const pixel = (image, x, y) => {
  const i = (y * image.info.width + x) * 4;
  return image.data.subarray(i, i + 4);
};
const { width: MW, height: MH } = MAILBOX_SHELL;
if (master.info.width !== MW || master.info.height !== MH)
  throw new Error('Master dimensions changed: review its registration first.');

// Only the neutral, light checkerboard connected to the canvas edge is removed.
// No resizing, silhouette mask, color replacement, feathering, or repainting.
const exterior = new Uint8Array(MW * MH);
const queue = new Int32Array(MW * MH);
let head = 0,
  tail = 0;
const visit = (x, y) => {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return;
  const p = y * MW + x;
  if (exterior[p]) return;
  const [r, g, b] = pixel(master, x, y);
  if (Math.min(r, g, b) < 140 || Math.max(r, g, b) - Math.min(r, g, b) > 32)
    return;
  exterior[p] = 1;
  queue[tail++] = p;
};
for (let x = 0; x < MW; x++) {
  visit(x, 0);
  visit(x, MH - 1);
}
for (let y = 0; y < MH; y++) {
  visit(0, y);
  visit(MW - 1, y);
}
while (head < tail) {
  const p = queue[head++],
    x = p % MW,
    y = Math.floor(p / MW);
  visit(x - 1, y);
  visit(x + 1, y);
  visit(x, y - 1);
  visit(x, y + 1);
}
const shell = Buffer.from(master.data);
let retained = 0,
  dark = 0,
  discardedDark = 0,
  contour = 0;
for (let p = 0; p < exterior.length; p++) {
  const i = p * 4;
  const isDark = Math.max(...master.data.subarray(i, i + 3)) < 100;
  if (isDark) {
    dark++;
    if (exterior[p]) discardedDark++;
  }
  if (exterior[p]) shell[i + 3] = 0;
  else {
    retained++;
    if (isDark && [p - 1, p + 1, p - MW, p + MW].some((n) => exterior[n]))
      contour++;
  }
}
await sharp(shell, { raw: { width: MW, height: MH, channels: 4 } })
  .png()
  .toFile(out + '/shell.png');

const inPolygon = (x, y, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i],
      [bx, by] = polygon[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      inside = !inside;
  }
  return inside;
};
// Split the existing master on its aperture in the source pixel grid. These
// disjoint layers reconstruct it exactly and sample identically at every size.
// In particular the real rim pixels, not a separately rounded SVG clip edge,
// occlude the envelope at fractional display scales.
for (const layer of ['interior', 'exterior']) {
  const data = Buffer.from(shell);
  for (let py = 0; py < MH; py++)
    for (let px = 0; px < MW; px++) {
      const interior = inPolygon(px + 0.5, py + 0.5, MAILBOX_DOOR_FACE);
      if (interior !== (layer === 'interior')) data[(py * MW + px) * 4 + 3] = 0;
    }
  await sharp(data, { raw: { width: MW, height: MH, channels: 4 } })
    .png()
    .toFile(out + `/${layer}.png`);
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// Door colors sampled from the master's navy edge, blue body and subdued rim.
const doorInk = {
  outline: [...pixel(master, 600, 216)].slice(0, 3),
  rim: [...pixel(master, 291, 425)].slice(0, 3),
  blue: [...pixel(master, 750, 380)].slice(0, 3),
  light: [...pixel(master, 660, 282)].slice(0, 3),
  shade: [...pixel(master, 720, 557)].slice(0, 3),
  underside: [...pixel(master, 730, 620)].slice(0, 3),
};
const [hingeLeftX, hingeLeftY] = MAILBOX_DOOR_FACE[0];
const [hingeRightX, hingeRightY] = MAILBOX_DOOR_FACE.at(-1);
const sourceHinge = (x) =>
  hingeLeftY +
  ((x - hingeLeftX) * (hingeRightY - hingeLeftY)) / (hingeRightX - hingeLeftX);
const doors = [],
  poses = [];
for (let frame = 0; frame < count; frame++) {
  // Rigid flap around the new inner sill. Projection is baked offline; every
  // frame uses the same arch, material and attachment, with no runtime warp.
  // A quarter turn from upright to the floor plane. The screen projection of
  // depth is (-0.68, 0.28); the hinge's sloping width vector never changes.
  const theta = ((frame / (count - 1)) * Math.PI) / 2;
  const project = ([x, y]) => {
    const v = sourceHinge(x) - y;
    const px = x - v * 0.68 * Math.sin(theta);
    const py =
      sourceHinge(x) - v * Math.cos(theta) + v * 0.28 * Math.sin(theta);
    // Keep the rigid polygon intact. Rounding its vertices independently made
    // edges cross and left missing columns near the hinge in edge-on poses.
    // Rasterization below supplies opaque pixel steps without antialiasing.
    return [px, py];
  };
  const points = MAILBOX_DOOR_FACE.map(project);
  poses.push(points);
  // Extrude the actual boundary before sampling it. Growing a sampled mask
  // cannot repair columns missed by a thin, nearly edge-on face.
  const thickness =
    frame === 0
      ? []
      : points.map(([ax, ay], i) => {
          const [bx, by] = points[(i + 1) % points.length];
          return [
            [ax, ay],
            [bx, by],
            [bx, by + 8],
            [ax, ay + 8],
          ];
        });
  const mask = new Uint8Array(MW * MH);
  for (let y = 180; y < 920; y++)
    for (let x = 25; x < 565; x++) {
      if (
        inPolygon(x + 0.5, y + 0.5, points) ||
        thickness.some((edge) => inPolygon(x + 0.5, y + 0.5, edge))
      )
        mask[y * MW + x] = 1;
    }
  const at = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && mask[y * MW + x];
  const data = Buffer.alloc(MW * MH * 4);
  const top = Math.min(...points.map((p) => p[1])),
    bottom = Math.max(...points.map((p) => p[1]));
  for (let y = 180; y < 920; y++)
    for (let x = 25; x < 565; x++) {
      if (!at(x, y)) continue;
      // The shell already owns the closed aperture's outline and blue rim.
      // Adding another ink contour here produced the doubled closed border.
      const weight = frame === 0 ? 0 : 10;
      const edge =
        !at(x - weight, y) ||
        !at(x + weight, y) ||
        !at(x, y - weight) ||
        !at(x, y + weight);
      const upperBevel = !at(x - weight - 10, y) || !at(x, y - weight - 10);
      const lowerBevel = !at(x + weight + 10, y) || !at(x, y + weight + 10);
      const band = y - top + Math.floor((x - 297) / 40) * 10;
      let color =
        band < (bottom - top) * 0.34
          ? doorInk.light
          : band > (bottom - top) * 0.7
            ? doorInk.shade
            : doorInk.blue;
      if (edge) color = doorInk.outline;
      else if (lowerBevel) color = doorInk.underside;
      else if (upperBevel) color = doorInk.rim;
      const i = (y * MW + x) * 4;
      data.set(color, i);
      data[i + 3] = 255;
    }
  doors.push(data);
  await sharp(data, { raw: { width: MW, height: MH, channels: 4 } })
    .png()
    .toFile(out + `/door-${frame}.png`);
}
await sharp({
  create: {
    width: MW * count,
    height: MH,
    channels: 4,
    background: '#00000000',
  },
})
  .composite(
    doors.map((input, i) => ({
      input,
      raw: { width: MW, height: MH, channels: 4 },
      left: i * MW,
      top: 0,
    })),
  )
  .png()
  .toFile(out + '/doors.png');
await writeFile(
  out + '/extraction-audit.json',
  JSON.stringify(
    {
      source: 'shell-border-master.png',
      sourceSize: [MW, MH],
      runtimeSize: [MW, MH],
      removedBackgroundPixels: tail,
      retainedArtworkPixels: retained,
      darkSourcePixels: dark,
      darkContourPixels: contour,
      discardedDarkPixels: discardedDark,
      modifiedRetainedRGBPixels: 0,
      shellMask: false,
      borderRepaint: false,
      postReplacement: false,
      doorSource: 'MAILBOX_DOOR_FACE inside approved master rim',
      doorInk,
    },
    null,
    2,
  ),
);
// Retain the flag's existing palette and registration independently of the shell.
const ink = { outline: rgb('#1c243e'), rimShade: rgb('#354a7c') };

// The flag keeps its source banner and fixed mounting screw. Only the lower
// pole weight and screw contact pixels receive palette/outline refinement.
// Nearest-pixel turns are baked into complete frames; no runtime sampling warp.
const flagPath =
  'M913 432H946V441H943V446H940V451H943V454H946V461H921V512H910V437H913Z';
const pivotPath =
  'M912 509H920V511H923V514H925V521H922V525H913V524H909V522H906V514H909V511H912Z';
const maskFor = async (path) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${origin.x} ${origin.y} ${W} ${H}" shape-rendering="crispEdges"><path fill="white" d="${path}"/></svg>`,
    ),
  )
    .ensureAlpha()
    .raw()
    .toBuffer();
const flagMask = await maskFor(flagPath),
  pivotMask = await maskFor(pivotPath);
const flags = [];
for (let frame = 0; frame < count; frame++) {
  const data = Buffer.alloc(W * H * 4),
    angle = ((1 - frame / (count - 1)) * Math.PI) / 2;
  const c = Math.cos(angle),
    s = Math.sin(angle),
    px = 916 - origin.x,
    py = 518 - origin.y;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - px,
        dy = y + 0.5 - py;
      const sx = Math.floor(px + c * dx + s * dy),
        sy = Math.floor(py - s * dx + c * dy);
      const pivot = pivotMask[(y * W + x) * 4 + 3] >= 128;
      if (
        !pivot &&
        !(
          sx >= 0 &&
          sx < W &&
          sy >= 0 &&
          sy < H &&
          flagMask[(sy * W + sx) * 4 + 3] >= 128
        )
      )
        continue;
      const sourceX = origin.x + (pivot ? x : sx);
      const sourceY = origin.y + (pivot ? y : sy);
      let color = pixel(reference, sourceX, sourceY);
      if (!pivot && sourceY >= 494 && sourceY <= 508) {
        if (sourceX === 911) color = ink.rimShade;
        else if (sourceY >= 501 && sourceX === 919) color = ink.rimShade;
      }
      if (pivot) {
        const pivotAt = (ax, ay) =>
          ax >= 0 &&
          ay >= 0 &&
          ax < W &&
          ay < H &&
          pivotMask[(ay * W + ax) * 4 + 3] >= 128;
        const edge =
          !pivotAt(x - 1, y) ||
          !pivotAt(x + 1, y) ||
          !pivotAt(x, y - 1) ||
          !pivotAt(x, y + 1);
        // Preserve the small red center. Shade the existing lower/right ring
        // and simplify its navy contact edge; do not add a halo or new disk.
        const neutral =
          Math.abs(color[0] - color[2]) < 24 &&
          Math.abs(color[0] - color[1]) < 24;
        if (edge && color[0] < 80 && color[2] - color[0] < 35)
          color = ink.outline;
        else if (sourceY >= 520 && neutral && color[0] > 80)
          color = sourceX >= 917 ? [83, 98, 125] : [114, 132, 160];
      }
      const i = (y * W + x) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
    }
  flags.push(data);
}
await sharp({
  create: { width: W * count, height: H, channels: 4, background: '#00000000' },
})
  .composite(
    flags.map((input, i) => ({
      input,
      raw: { width: W, height: H, channels: 4 },
      left: i * W,
      top: 0,
    })),
  )
  .png()
  .toFile(out + '/flags.png');
await sharp('public/world/reference/target.png')
  .extract({ left: 823, top: 515, width: 47, height: 41 })
  .png()
  .toFile(out + '/letter.png');
await writeFile(
  out + '/registration.json',
  JSON.stringify(
    {
      origin,
      width: W,
      height: H,
      hinge: MAILBOX_HINGE,
      shell: MAILBOX_SHELL,
      doorCanvas: { width: MW, height: MH },
      poses,
      frameCount: count,
    },
    null,
    2,
  ),
);
console.log(
  'Authored one registered shell, nine door drawings, nine flag poses, and the original letter.',
);
