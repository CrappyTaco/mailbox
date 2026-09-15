import { DELIVERY_GLOBE, MAILBOX_ART } from './world-style';
export type DeliveryPhase =
  | 'departing'
  | 'travelling'
  | 'waiting'
  | 'inserting'
  | 'closing'
  | 'raising'
  | 'complete';
export const DEPARTURE_SECONDS = 1.2;
export const READY_SECONDS = 0.24;
export const FLIGHT_SECONDS = 6.2;
export const INSERT_SECONDS = 1.6;
export const CONTAINED_SECONDS = 0.22;
export const CLOSE_SECONDS = 0.6;
export const RAISE_SECONDS = 0.5;
export const FLIGHT_ENVELOPE = {
  width: MAILBOX_ART.stored.width * MAILBOX_ART.globe.scale,
  height: MAILBOX_ART.stored.height * MAILBOX_ART.globe.scale,
};
// Derived from the same sprite anchors as the main scene, at exactly half scale.
const { globe, mouth, stored, exitX } = MAILBOX_ART;
const { centerX, centerY } = DELIVERY_GLOBE;
export function mailboxLetterCenter(letterX: number, receiving = false) {
  const x = globe.x + (letterX + stored.width / 2) * globe.scale;
  const y = globe.y + (stored.y + stored.height / 2) * globe.scale;
  return receiving ? { x: 2 * centerX - x, y: 2 * centerY - y } : { x, y };
}
export const DEPARTING_MOUTH = {
  ...mailboxLetterCenter(stored.x),
};
export const RECEIVING_MOUTH = {
  lip: 400 - (globe.x + stored.x * globe.scale),
  outer: 400 - (globe.x + mouth.left * globe.scale),
  top: 440 - (globe.y + mouth.bottom * globe.scale),
  bottom: 440 - (globe.y + mouth.top * globe.scale),
  centerY: 440 - DEPARTING_MOUTH.y,
};
export const ORBIT = {
  x: centerX,
  y: centerY,
  entryX: mailboxLetterCenter(exitX).x,
  exitX: 2 * centerX - mailboxLetterCenter(exitX).x,
  radius: Math.hypot(
    mailboxLetterCenter(exitX).x - centerX,
    centerY - DEPARTING_MOUTH.y,
  ),
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
export function deliveryFrame(elapsed: number, confirmedAt: number | null) {
  let x = DEPARTING_MOUTH.x,
    y = DEPARTING_MOUTH.y,
    angle = 0,
    phase: DeliveryPhase = 'departing',
    letterX: number = stored.x;
  if (elapsed < DEPARTURE_SECONDS) {
    letterX = lerp(
      stored.x,
      exitX,
      ease((elapsed - READY_SECONDS) / (DEPARTURE_SECONDS - READY_SECONDS)),
    );
    ({ x, y } = mailboxLetterCenter(letterX));
  } else if (elapsed < FLIGHT_SECONDS) {
    phase = 'travelling';
    const t =
      (elapsed - DEPARTURE_SECONDS) / (FLIGHT_SECONDS - DEPARTURE_SECONDS);
    const eased = t * t * (3 - 2 * t);
    // Both mailboxes retain the original artwork's orientation. A half orbit
    // connects their outward directions; no reflected shell or letter is needed.
    const radius = ORBIT.radius,
      start = Math.atan2(DEPARTING_MOUTH.y - centerY, ORBIT.entryX - centerX);
    const theta = start - Math.PI * eased;
    x = centerX + radius * Math.cos(theta);
    y = centerY + radius * Math.sin(theta);
    angle = -180 * eased;
  } else {
    letterX = exitX;
    angle = -180;
    phase = 'waiting';
    if (confirmedAt !== null) {
      const receipt = elapsed - Math.max(FLIGHT_SECONDS, confirmedAt);
      if (receipt >= 0) {
        phase =
          receipt < INSERT_SECONDS
            ? 'inserting'
            : receipt < INSERT_SECONDS + CLOSE_SECONDS
              ? 'closing'
              : receipt < INSERT_SECONDS + CLOSE_SECONDS + RAISE_SECONDS
                ? 'raising'
                : 'complete';
        letterX = lerp(
          exitX,
          stored.x,
          ease(receipt / (INSERT_SECONDS - CONTAINED_SECONDS)),
        );
      }
    }
    ({ x, y } = mailboxLetterCenter(letterX, true));
  }
  const receiptTime =
    confirmedAt === null ? -1 : elapsed - Math.max(FLIGHT_SECONDS, confirmedAt);
  return {
    x,
    y,
    angle,
    letterX,
    phase,
    closed: phase === 'closing' || phase === 'raising' || phase === 'complete',
    flag: phase === 'raising' || phase === 'complete',
    departureDoor: 1 - ease((elapsed - DEPARTURE_SECONDS) / CLOSE_SECONDS),
    doorProgress: 1 - ease((receiptTime - INSERT_SECONDS) / CLOSE_SECONDS),
    flagProgress: ease(
      (receiptTime - INSERT_SECONDS - CLOSE_SECONDS) / RAISE_SECONDS,
    ),
  };
}
export function solarCycle(hour: number) {
  const angle = ((hour - 12) * Math.PI) / 12;
  return { x: Math.sin(angle), y: -Math.cos(angle), angle };
}
// One hemisphere, sampled on an integer grid. Three narrow stepped bands
// soften the terminator without a smooth gradient or whole-scene overlay.
export function globeShadow(x: number, y: number, hour: number) {
  const sun = solarCycle(hour),
    dot = x * sun.x + y * sun.y;
  return dot > 5 ? 0 : dot > 0 ? 0.14 : dot > -5 ? 0.31 : 0.53;
}
