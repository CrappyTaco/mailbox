export const ENVELOPE_SECONDS = 2.8;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
// One position function for both directions: 0 = sealed, 1 = full readable sheet.
// Only the front of the envelope and its bottom clip occlude the paper.
export function envelopeFrame(progress: number) {
  const p = clamp(progress),
    flap = ease(p / 0.16),
    extraction = ease((p - 0.2) / 0.43),
    presentation = ease((p - 0.67) / 0.33);
  return {
    scale: 0.5 + 0.5 * presentation,
    x: 25 * (1 - presentation),
    y: (56 - 54 * extraction) * (1 - presentation),
    envelopeY: 52 + 70 * presentation,
    flapScale: 1 - 2 * flap,
    flapBehind: flap > 0.5,
    clipBottom: 14 * (1 - presentation),
    stage: p <= 0.16 ? 'flap' : p < 0.67 ? 'sheet' : 'present',
  };
}
