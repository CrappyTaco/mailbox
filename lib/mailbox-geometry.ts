import {
  MAILBOX_DOOR_FACE,
  MAILBOX_PASSAGE_FACE,
  MAILBOX_SHELL,
} from './mailbox-sprites';

const { x, y, scale } = MAILBOX_SHELL;
const local = (px: number, py: number) => ({
  x: x + px * scale,
  y: y + py * scale,
});
// Door attachment and letter occlusion follow the approved opening, not the
// previous mailbox's ellipse. The sloping bottom is the master's inner sill.
const hingeLeft = MAILBOX_DOOR_FACE[0];
const hingeRight = MAILBOX_DOOR_FACE[MAILBOX_DOOR_FACE.length - 1];
export const MAILBOX_HINGE = {
  ...local(...hingeLeft),
  width: (hingeRight[0] - hingeLeft[0]) * scale,
  rise: (hingeRight[1] - hingeLeft[1]) * scale,
} as const;
export function mailboxFloorAt(px: number) {
  return (
    MAILBOX_HINGE.y +
    ((px - MAILBOX_HINGE.x) * MAILBOX_HINGE.rise) / MAILBOX_HINGE.width
  );
}
const path = (points: readonly (readonly [number, number])[]) =>
  points
    .map(([px, py], i) => `${i ? 'L' : 'M'}${x + px * scale} ${y + py * scale}`)
    .join('') + 'Z';
// Keep the original envelope's aspect ratio at a smaller, shared scene scale.
// Seat most of it behind the existing near wall, leaving its folded corner
// visible inside the opening. Extraction uses this same complete sprite.
const letterWidth = 47 * 0.4;
const letterHeight = 41 * 0.4;
const storedX = 29.5;
// The lower left corner touches the sloping sill. Snap inward to the half-unit
// letter pixel grid, within one pixel of contact; never suspend it at mouth center.
const storedY = Math.floor((mailboxFloorAt(storedX) - letterHeight) * 2) / 2;
// Follow the sill's existing perspective during extraction/insertion. A deeper
// resting position cannot travel horizontally without grazing the raised lip.
export function mailboxLetterY(letterX: number) {
  return storedY + mailboxFloorAt(letterX) - mailboxFloorAt(storedX);
}
export const mailboxGeometry = {
  mouth: {
    left: local(255, 0).x, // outer front jamb, not the inside edge of the aperture
    right: local(558, 0).x,
    top: local(0, 287).y,
    bottom: local(558, 674).y,
    centerY: storedY + letterHeight / 2,
  },
  opening: path(MAILBOX_DOOR_FACE),
  passage: path(MAILBOX_PASSAGE_FACE),
  stored: { x: storedX, y: storedY, width: letterWidth, height: letterHeight },
  // At this point the complete envelope is beyond the open door's tip.
  exitX: MAILBOX_SHELL.x - letterWidth,
  // The original master has transparent padding and a scalloped post end.
  // Plant the continuous shaft (above those scallops), not the canvas bottom.
  ground: local(658, 1177),
  postTip: local(658, 1282),
} as const;
