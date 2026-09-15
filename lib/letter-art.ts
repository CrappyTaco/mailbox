export const PAPER_WIDTH = 600;
export const PAPER_HEIGHT = 760;
export const stampIds = [
  'toffee',
  'earl',
  'wilfred',
  'squashy',
  'nibbler',
  'noddle',
  'lady',
  'flower',
  'mailbox',
  'clover',
] as const;
export type StampId = (typeof stampIds)[number];
export const inkColors = [
  '#59434b',
  '#a55360',
  '#c88798',
  '#54799c',
  '#526f52',
  '#bf8757',
  '#887194',
] as const;
export type InkColor = (typeof inkColors)[number];
export const inkNames = [
  'Brown ink',
  'Muted red',
  'Dusty pink',
  'Muted blue',
  'Forest green',
  'Warm orange',
  'Purple',
];
export type Point = [number, number];
export interface InkStroke {
  page?: number;
  color: InkColor;
  width: number;
  points: Point[];
}
export interface StampPlacement {
  design: StampId;
  x: number;
  y: number;
  rotation: number;
}
export interface LetterArt {
  version: 1;
  stamp: StampPlacement | null;
  strokes: InkStroke[];
}
export const emptyArt = (): LetterArt => ({
  version: 1,
  stamp: null,
  strokes: [],
});
export const newLetterArt = (): LetterArt => ({
  version: 1,
  stamp: { design: 'flower', x: 514, y: 91, rotation: -5 },
  strokes: [],
});
export function clampStamp(stamp: StampPlacement): StampPlacement {
  return {
    ...stamp,
    x: Math.max(54, Math.min(546, stamp.x)),
    y: Math.max(58, Math.min(702, stamp.y)),
    rotation: Math.max(-12, Math.min(12, stamp.rotation)),
  };
}
export const pointCount = (strokes: InkStroke[]) =>
  strokes.reduce((sum, s) => sum + s.points.length, 0);
export const strokePath = (points: Point[]) =>
  points.length === 1
    ? `M${points[0][0]} ${points[0][1]}h.01`
    : points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
export function hasSignature(art: LetterArt) {
  let length = 0;
  const inside = ([x, y]: Point) => x >= 40 && x <= 450 && y >= 620 && y <= 716;
  for (const stroke of art.strokes)
    for (let i = 1; i < stroke.points.length; i++)
      if (inside(stroke.points[i - 1]) && inside(stroke.points[i]))
        length += Math.hypot(
          stroke.points[i][0] - stroke.points[i - 1][0],
          stroke.points[i][1] - stroke.points[i - 1][1],
        );
  return length >= 20;
}
function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
// Remove ink geometry, splitting paths at the erased sections. Paper and stamp are untouched.
export function eraseInk(
  strokes: InkStroke[],
  from: Point,
  to: Point,
  radius: number,
): InkStroke[] {
  const result: InkStroke[] = [];
  for (const stroke of strokes) {
    let run: Point[] = [];
    const flush = () => {
      for (let i = 0; i < run.length; i += 1199)
        result.push({ ...stroke, points: run.slice(i, i + 1200) });
      run = [];
    };
    const sample = (p: Point) => {
      if (distanceToSegment(p, from, to) <= radius + stroke.width / 2) flush();
      else run.push(p);
    };
    for (let i = 0; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      if (i) {
        const a = stroke.points[i - 1];
        const steps = Math.ceil(Math.hypot(p[0] - a[0], p[1] - a[1]) / 3);
        for (let j = 1; j < steps; j++)
          sample([
            +(a[0] + ((p[0] - a[0]) * j) / steps).toFixed(1),
            +(a[1] + ((p[1] - a[1]) * j) / steps).toFixed(1),
          ]);
      }
      sample(p);
    }
    flush();
  }
  // An eraser cannot make a letter exceed its transport budget through path fragmentation.
  return result.length > 256 || pointCount(result) > 12000 ? strokes : result;
}
