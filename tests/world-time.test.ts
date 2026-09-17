import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mailbox } from '../components/mailbox/Mailbox';
import {
  ENABLE_WORLD_CHARACTERS,
  WORLD_CONFIG,
  localTime,
  skyPalette,
  celestialPosition,
  parseSkyPreview,
  gradeColor,
  clockPaper,
  CLOCK_INK,
  mixColor,
} from '../lib/world-time';
void test('world clocks follow IANA zones across Seattle daylight-saving transitions', () => {
  assert.equal(WORLD_CONFIG.indi.timezone, 'Asia/Bangkok');
  assert.equal(
    localTime('auggie', Date.parse('2026-03-08T09:59:00Z')).label,
    '01:59',
  );
  assert.equal(
    localTime('auggie', Date.parse('2026-03-08T10:00:00Z')).label,
    '03:00',
  );
  assert.equal(
    localTime('indi', Date.parse('2026-03-08T10:00:00Z')).label,
    '17:00',
  );
  assert.equal(
    localTime('auggie', Date.parse('2026-11-01T08:59:00Z')).label,
    '01:59',
  );
  assert.equal(
    localTime('auggie', Date.parse('2026-11-01T09:00:00Z')).label,
    '01:00',
  );
  assert.equal(
    localTime('indi', Date.parse('2026-11-01T09:00:00Z')).label,
    '16:00',
  );
});
void test('same instant gives a night in Bangkok and a day in Seattle, independent of viewer timezone', () => {
  const time = Date.parse('2026-09-06T19:00:00Z');
  assert.equal(localTime('indi', time).label, '02:00');
  assert.equal(localTime('auggie', time).label, '12:00');
  assert.ok(skyPalette(localTime('indi', time).hour).night > 0.9);
  assert.equal(skyPalette(localTime('auggie', time).hour).night, 0);
});
void test('celestial arcs peak around noon/midnight and keep below-horizon objects hidden', () => {
  const dawn = celestialPosition(6.3, 'sun'),
    noon = celestialPosition(12, 'sun'),
    dusk = celestialPosition(18.2, 'sun');
  assert.ok(dawn.x < noon.x && noon.x < dusk.x);
  assert.ok(dawn.y > noon.y && dusk.y > noon.y);
  assert.equal(noon.x, 50);
  assert.equal(noon.y, 12);
  assert.equal(celestialPosition(2, 'sun').opacity, 0);
  assert.equal(celestialPosition(12, 'moon').opacity, 0);
  assert.ok(celestialPosition(0.25, 'moon').opacity > 0.99);
});
void test('sky palette is continuous at keyframes and midnight; lighting preserves midday colors', () => {
  for (const hour of [0, 4, 5.5, 6.5, 8, 12, 15, 17, 18.5, 19.5, 21, 24]) {
    const a = skyPalette(hour - 0.00001),
      b = skyPalette(hour + 0.00001);
    assert.equal(a.sky, b.sky);
    assert.equal(a.horizon, b.horizon);
    assert.ok(Math.abs(a.ground - b.ground) < 0.0001);
  }
  assert.equal(gradeColor('#5271b9', 1, 0, 0), '#5271b9');
  assert.notEqual(skyPalette(2).cloud, skyPalette(12).cloud);
  assert.ok(skyPalette(2).ground < skyPalette(2).mailbox);
});
void test('preview-time override is local-only and animals are disabled without removing their system', () => {
  assert.equal(ENABLE_WORLD_CHARACTERS, false);
  assert.equal(parseSkyPreview('2026-09-06T19:00:00Z', false), undefined);
  assert.equal(parseSkyPreview('junk', true), undefined);
  assert.equal(parseSkyPreview(['2026-09-06T19:00:00Z'], true), undefined);
  assert.equal(
    parseSkyPreview('2026-09-06T19:00:00Z', true),
    Date.parse('2026-09-06T19:00:00Z'),
  );
});
void test('clock and corner text stay readable through every minute of twilight', () => {
  const light = (hex: string) => {
    const channels = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const contrast = (a: string, b: string) =>
    (Math.max(light(a), light(b)) + 0.05) /
    (Math.min(light(a), light(b)) + 0.05);
  for (let minute = 0; minute < 1440; minute++) {
    const p = skyPalette(minute / 60);
    const ground = gradeColor('#6f7e60', p.ground, p.warm, p.night);
    const background = mixColor(clockPaper(p.night), ground, 0.18);
    assert.ok(
      contrast(CLOCK_INK, background) >= 4.5,
      `clock at minute ${minute}`,
    );
    assert.ok(contrast(p.ui, p.sky) >= 4.5, `corner text at minute ${minute}`);
  }
});
void test('complete envelope sits between rear artwork and the foreground wall and door', () => {
  const open = renderToStaticMarkup(
    createElement(Mailbox, { mail: true, ajar: true }),
  );
  assert.doesNotMatch(open, /clipPath|clip-path|<mask/);
  assert.match(open, /mailbox-letter/);
  assert.match(open, /flag-up/);
  assert.match(open, /data-door-progress="1.000"/);
  assert.match(open, /data-flag-progress="1.000"/);
  assert.ok(open.indexOf('mailbox-interior') < open.indexOf('mailbox-letter'));
  assert.ok(open.indexOf('mailbox-letter') < open.indexOf('mailbox-shell'));
  assert.ok(
    open.indexOf('mailbox-letter') < open.indexOf('mailbox-hinged-door'),
  );
  const closed = renderToStaticMarkup(createElement(Mailbox, { mail: true }));
  assert.ok(
    closed.indexOf('mailbox-letter') < closed.indexOf('mailbox-hinged-door'),
  );
  assert.match(closed, /data-door-progress="0.000"/);
  // The complete letter stays behind the same raster door in both states.
  assert.doesNotMatch(closed, /clipPath|clip-path|<mask/);
  assert.match(closed, /data-flag-progress="1.000"/);
  assert.match(closed, /\/world\/mailbox\/letter.png/);
  assert.match(closed, /\/world\/mailbox\/doors.png/);
});
