import type { Owner } from './mailbox-state';
import { solarCycle } from './delivery';

// Keeping the component unmounted also stops its director, timers and hit targets.
export const ENABLE_WORLD_CHARACTERS = false;
export const WORLD_CONFIG = {
  indi: { name: 'Indi', timezone: 'Asia/Bangkok', locationLabel: 'Bangkok' },
  auggie: {
    name: 'Auggie',
    timezone: 'America/Los_Angeles',
    locationLabel: 'Seattle',
  },
} as const;
const formatters = Object.fromEntries(
  Object.entries(WORLD_CONFIG).map(([owner, config]) => [
    owner,
    new Intl.DateTimeFormat('en-GB', {
      timeZone: config.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }),
  ]),
) as Record<Owner, Intl.DateTimeFormat>;
export function localTime(owner: Owner, instant: number) {
  const parts = formatters[owner].formatToParts(instant);
  const value = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = value('hour'),
    minute = value('minute'),
    second = value('second');
  return {
    hour: hour + minute / 60 + second / 3600,
    label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}
export function parseSkyPreview(
  value: string | string[] | undefined,
  local: boolean,
) {
  if (
    !local ||
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
  )
    return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) =>
  rgb(hex).reduce((sum, channel, i) => {
    const value = channel / 255;
    return (
      sum +
      (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
        [0.2126, 0.7152, 0.0722][i]
    );
  }, 0);
function readableWorldInk(sky: string) {
  const background = luminance(sky);
  const contrast = (ink: string) => {
    const foreground = luminance(ink);
    return (
      (Math.max(background, foreground) + 0.05) /
      (Math.min(background, foreground) + 0.05)
    );
  };
  if (contrast('#252238') >= 4.5) return '#252238';
  // Text switches ink without cross-fading through an unreadable middle tone.
  return contrast('#030207') >= contrast('#fffdf6') ? '#030207' : '#fffdf6';
}
export const CLOCK_INK = '#e9e4d6';
export const clockPaper = (nightAmount: number) =>
  mixColor('#42585e', '#25374b', nightAmount);
export function mixColor(a: string, b: string, amount: number) {
  const x = rgb(a),
    y = rgb(b);
  return (
    '#' +
    x
      .map((v, i) =>
        Math.round(v + (y[i] - v) * amount)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
interface Palette {
  sky: string;
  horizon: string;
  cloud: string;
  cloudLight: string;
  cloudShade: string;
  distant: string;
  ground: number;
  mailbox: number;
  warm: number;
  night: number;
  ui: string;
}
interface SkyKey extends Omit<Palette, 'ui'> {
  at: number;
}
const night: Omit<Palette, 'ui'> = {
  sky: '#20395a',
  horizon: '#254368',
  cloud: '#344455',
  cloudLight: '#3b4c5e',
  cloudShade: '#283749',
  distant: '#354850',
  ground: 0.43,
  mailbox: 0.69,
  warm: 0,
  night: 1,
};
const keys: SkyKey[] = [
  { at: 0, ...night },
  {
    at: 4,
    ...night,
    sky: '#20395a',
    horizon: '#254368',
    cloud: '#44475d',
    cloudLight: '#505166',
    ground: 0.47,
    mailbox: 0.72,
    night: 0.88,
  },
  {
    at: 5.5,
    sky: '#667184',
    horizon: '#c39a9e',
    cloud: '#a09baf',
    cloudLight: '#b4a9b8',
    cloudShade: '#73788d',
    distant: '#717d88',
    ground: 0.62,
    mailbox: 0.79,
    warm: 0.1,
    night: 0.36,
  },
  {
    at: 6.5,
    sky: '#acbecb',
    horizon: '#e4bfab',
    cloud: '#edcfba',
    cloudLight: '#f4dfc8',
    cloudShade: '#c1acac',
    distant: '#97adae',
    ground: 0.87,
    mailbox: 0.94,
    warm: 0.25,
    night: 0,
  },
  {
    at: 8,
    sky: '#bfd8e0',
    horizon: '#e0e3d7',
    cloud: '#f6ebd8',
    cloudLight: '#fff5e3',
    cloudShade: '#d9d0c6',
    distant: '#a6c1c5',
    ground: 0.98,
    mailbox: 1,
    warm: 0.05,
    night: 0,
  },
  {
    at: 12,
    sky: '#c5dfe8',
    horizon: '#d6e8ea',
    cloud: '#f9eddb',
    cloudLight: '#fff7e5',
    cloudShade: '#e8d9cf',
    distant: '#a8c6cb',
    ground: 1,
    mailbox: 1,
    warm: 0,
    night: 0,
  },
  {
    at: 15,
    sky: '#cadce0',
    horizon: '#e5e1d0',
    cloud: '#f4e6d0',
    cloudLight: '#fff0d9',
    cloudShade: '#d8c8bc',
    distant: '#abbfc0',
    ground: 1,
    mailbox: 1,
    warm: 0.08,
    night: 0,
  },
  {
    at: 17,
    sky: '#c9c6ca',
    horizon: '#e2b896',
    cloud: '#e9c6aa',
    cloudLight: '#f3d9b9',
    cloudShade: '#c3a3a0',
    distant: '#b0aaa7',
    ground: 0.9,
    mailbox: 0.96,
    warm: 0.33,
    night: 0,
  },
  {
    at: 18.5,
    sky: '#9b95af',
    horizon: '#d1a099',
    cloud: '#baa0b0',
    cloudLight: '#d1adb7',
    cloudShade: '#8a819b',
    distant: '#8e8c9c',
    ground: 0.72,
    mailbox: 0.88,
    warm: 0.21,
    night: 0.12,
  },
  {
    at: 19.5,
    sky: '#535d7b',
    horizon: '#8b788c',
    cloud: '#74768f',
    cloudLight: '#86829a',
    cloudShade: '#555f7b',
    distant: '#606f80',
    ground: 0.57,
    mailbox: 0.77,
    warm: 0.04,
    night: 0.62,
  },
  {
    at: 21,
    ...night,
    sky: '#20395a',
    horizon: '#254368',
    cloud: '#45506b',
    cloudLight: '#515c77',
    cloudShade: '#303e55',
    distant: '#405264',
    ground: 0.46,
    night: 0.92,
  },
  { at: 24, ...night },
];
export function skyPalette(hour: number): Palette {
  const h = ((hour % 24) + 24) % 24;
  const end = keys.findIndex((k) => k.at > h),
    a = keys[end - 1],
    b = keys[end];
  const t = (h - a.at) / (b.at - a.at),
    blend = t * t * (3 - 2 * t);
  const color = (
    key: 'sky' | 'horizon' | 'cloud' | 'cloudLight' | 'cloudShade' | 'distant',
  ) => mixColor(a[key], b[key], blend);
  const value = (key: 'ground' | 'mailbox' | 'warm' | 'night') =>
    a[key] + (b[key] - a[key]) * blend;
  return {
    sky: color('sky'),
    horizon: color('horizon'),
    cloud: color('cloud'),
    cloudLight: color('cloudLight'),
    cloudShade: color('cloudShade'),
    distant: color('distant'),
    ui: readableWorldInk(color('sky')),
    ground: value('ground'),
    mailbox: value('mailbox'),
    warm: value('warm'),
    night: value('night'),
  };
}
// A deliberately stylized civil-time arc, not an astronomical sunrise/phase forecast.
// The world and delivery globe share one 24-hour sun/moon orbit.
export function celestialPosition(hour: number, kind: 'sun' | 'moon') {
  const h = ((hour % 24) + 24) % 24;
  const elapsed = kind === 'sun' ? h - 6 : (h - 18 + 24) % 24;
  const duration = 12;
  const sun = solarCycle(h);
  const direction = kind === 'sun' ? 1 : -1;
  const visible = elapsed >= 0 && elapsed <= duration;
  const fade = Math.min(
    1,
    Math.max(0, elapsed / 0.6),
    Math.max(0, (duration - elapsed) / 0.6),
  );
  return {
    x: 50 + 42 * sun.x * direction,
    y: 92 + 80 * sun.y * direction,
    opacity: visible ? fade : 0,
  };
}
export function gradeColor(
  base: string,
  brightness: number,
  warmth: number,
  nightAmount: number,
) {
  const toned = rgb(base).map((v, i) =>
    Math.max(
      0,
      Math.min(255, Math.round(v * brightness + [8, 10, 20][i] * nightAmount)),
    ),
  );
  const color =
    '#' + toned.map((v) => v.toString(16).padStart(2, '0')).join('');
  return mixColor(color, '#d4a176', warmth * 0.2);
}
