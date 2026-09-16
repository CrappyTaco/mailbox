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
const { centerY } = DELIVERY_GLOBE;
// Reflect the entire assembly about the equator: both openings face left and
// both post anchors stay planted. Door, flag, shadow and aperture share this
// transform. The envelope alone is counter-reflected to stay upright.
export const BOTTOM_MAILBOX_TRANSFORM = `translate(0 ${2 * centerY}) scale(1 -1)`;
export function mailboxLetterCenter(letterX: number, receiving = false) {
  const x = globe.x + (letterX + stored.width / 2) * globe.scale;
  const y = globe.y + (stored.y + stored.height / 2) * globe.scale;
  return receiving ? { x, y: 2 * centerY - y } : { x, y };
}
export const DEPARTING_MOUTH = {
  ...mailboxLetterCenter(stored.x),
};
export const RECEIVING_MOUTH = {
  lip: globe.x + (stored.x + stored.width) * globe.scale,
  outer: globe.x + mouth.left * globe.scale,
  top: 2 * centerY - (globe.y + mouth.bottom * globe.scale),
  bottom: 2 * centerY - (globe.y + mouth.top * globe.scale),
  centerY: 2 * centerY - DEPARTING_MOUTH.y,
};
export const FLIGHT_PATH = {
  start: mailboxLetterCenter(exitX),
  end: mailboxLetterCenter(exitX, true),
  // Horizontal tangents at both ends join the local extraction/insertion axis.
  // The middle of the curve clears the globe, including the envelope's width.
  controlX: DELIVERY_GLOBE.x - FLIGHT_ENVELOPE.width - 40,
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
export function deliveryFrame(elapsed: number, confirmedAt: number | null) {
  const angle = 0;
  let x = DEPARTING_MOUTH.x,
    y = DEPARTING_MOUTH.y,
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
    const { start, end, controlX } = FLIGHT_PATH;
    const u = 1 - eased;
    x = u ** 3 * start.x + 3 * u * eased * controlX + eased ** 3 * end.x;
    y =
      (u ** 3 + 3 * u * u * eased) * start.y +
      (3 * u * eased * eased + eased ** 3) * end.y;
  } else {
    letterX = exitX;
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
