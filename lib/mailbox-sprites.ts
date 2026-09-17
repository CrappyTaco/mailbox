// Registered to the existing 112 × 154 mailbox viewBox. Two raster pixels per
// local unit; the extra 24 units on the left contain the outward-opening door.
export const MAILBOX_SPRITES = {
  x: -24,
  y: 0,
  width: 272,
  height: 308,
  scale: 0.5,
  frames: 9,
  shell: '/world/mailbox/shell.png',
  interior: '/world/mailbox/interior.png',
  exterior: '/world/mailbox/exterior.png',
  doors: '/world/mailbox/doors.png',
  flags: '/world/mailbox/flags.png',
  letter: '/world/mailbox/letter.png',
} as const;

// The approved master keeps its own full-resolution canvas. These coordinates
// register it to the scene without squeezing it through the old sprite mask.
export const MAILBOX_SHELL = {
  x: -26,
  y: -4.5,
  width: 1122,
  height: 1402,
  scale: 128 / 1122,
} as const;

// Traced along the INSIDE of the approved master's blue front rim, in master
// pixels. The shell owns the rim; the seated door only fills this opening.
export const MAILBOX_DOOR_FACE = [
  [297, 652],
  [297, 383],
  [307, 383],
  [307, 358],
  [318, 358],
  [318, 338],
  [328, 338],
  [328, 327],
  [339, 327],
  [339, 317],
  [351, 317],
  [351, 307],
  [360, 307],
  [360, 297],
  [377, 297],
  [377, 287],
  [455, 287],
  [455, 297],
  [468, 297],
  [468, 307],
  [479, 307],
  [479, 317],
  [490, 317],
  [490, 327],
  [504, 327],
  [504, 348],
  [519, 348],
  [519, 369],
  [532, 369],
  [532, 391],
  [541, 391],
  [541, 413],
  [558, 413],
  [558, 674],
] as const;

// The letter travels in front of the far (left) jamb and behind the near
// (right) jamb. Extend the aperture toward the approach side, keeping its
// near arch and sill. This polygon partitions the raster shell into rear and
// foreground artwork; the complete letter is never clipped to this polygon.
export const MAILBOX_PASSAGE_FACE = [
  [-2048, 287],
  ...MAILBOX_DOOR_FACE.slice(15),
  [-2048, 674],
] as const;

// Select a completed drawing. Never blend, shear, rotate, or interpolate door
// silhouettes in the browser. The existing reversible timeline supplies t.
export function mailboxSpriteFrame(progress: number) {
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return Math.round(t * (MAILBOX_SPRITES.frames - 1));
}
