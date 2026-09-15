import { mailboxGeometry } from './mailbox-geometry';
// Shared material colors for the world sprites, stationery and embedded UI.
export const WORLD_STYLE = {
  ink: '#252238',
  blueShade: '#4b568e',
  blue: '#596fb0',
  blueLight: '#7891c5',
  silver: '#adc0d1',
  rose: '#bd4760',
  wood: '#814f5d',
  greenShade: '#526449',
  green: '#809866',
  grass: '#adc08b',
  paper: '#f4e9ce',
  paperShade: '#d1b598',
  paperFold: '#a68a78',
} as const;

// A single physical envelope coordinate system, including the animated flap.
export const ENVELOPE_ART = {
  width: 160,
  height: 88,
  viewBox: '0 0 160 88',
} as const;

export const DELIVERY_GLOBE = {
  x: 105,
  y: 125,
  size: 190,
  centerX: 200,
  centerY: 220,
} as const;
const globeScale = 0.5;
export const MAILBOX_ART = {
  width: 112,
  height: 154,
  ...mailboxGeometry,
  globe: {
    x: DELIVERY_GLOBE.centerX - mailboxGeometry.ground.x * globeScale,
    y: DELIVERY_GLOBE.y - mailboxGeometry.ground.y * globeScale,
    width: 112 * globeScale,
    height: 154 * globeScale,
    scale: globeScale,
  },
} as const;

// A letter can be in front of the entrance plane or visible through its aperture.
// The rest of the mailbox volume is solid, even beyond a sloped sprite edge.
export function mailboxPassagePath(approach = true) {
  return `${approach ? `M-256 -256H${MAILBOX_ART.mouth.left}V390H-256Z ` : ''}${MAILBOX_ART.opening}`;
}
