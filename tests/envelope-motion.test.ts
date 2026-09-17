import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelopeFrame } from '../lib/envelope-motion';
import {
  deliveryFrame,
  FLIGHT_SECONDS,
  RECEIVING_MOUTH,
  FLIGHT_ENVELOPE,
  INSERT_SECONDS,
} from '../lib/delivery';

void test('paper is fully extracted before envelope leaves, and insertion retraces the same geometry', () => {
  const closed = envelopeFrame(0),
    extracted = envelopeFrame(0.67),
    read = envelopeFrame(1);
  assert.equal(closed.scale, extracted.scale);
  assert.equal(closed.envelopeY, extracted.envelopeY);
  assert.ok(closed.y > closed.envelopeY);
  assert.equal(extracted.y + extracted.scale * 100, extracted.envelopeY);
  assert.equal(extracted.flapScale, -1);
  assert.deepEqual([read.x, read.y, read.scale], [0, 0, 1]);
  assert.ok(read.envelopeY > 100);
  for (let i = 0; i <= 100; i++) {
    const outward = envelopeFrame(i / 100),
      inward = envelopeFrame(1 - (100 - i) / 100);
    for (const key of [
      'x',
      'y',
      'scale',
      'envelopeY',
      'flapScale',
      'clipBottom',
    ] as const)
      assert.ok(Math.abs(outward[key] - inward[key]) < 1e-9);
    // The sheet has a physical size throughout; it never shrinks to nothing.
    assert.ok(outward.scale >= 0.42 && outward.scale <= 1);
    if (outward.envelopeY > 52)
      assert.ok(outward.y + outward.scale * 100 <= outward.envelopeY);
  }
});
void test('envelope approaches the receiving opening from its open side and is contained before closure', () => {
  const waiting = deliveryFrame(FLIGHT_SECONDS, null);
  assert.ok(
    deliveryFrame(FLIGHT_SECONDS + 0.02, 0).x > waiting.x,
    'approach is left-to-right, matching the mouth',
  );
  assert.ok(waiting.x + FLIGHT_ENVELOPE.width / 2 < RECEIVING_MOUTH.outer);
  assert.ok(waiting.y - FLIGHT_ENVELOPE.height / 2 >= RECEIVING_MOUTH.top);
  assert.ok(waiting.y + FLIGHT_ENVELOPE.height / 2 <= RECEIVING_MOUTH.bottom);
  // A deeper resting position changes when the envelope crosses the jamb,
  // while the existing insertion timing and easing stay the same.
  const crossing = Array.from({ length: 99 }, (_, i) =>
    deliveryFrame(FLIGHT_SECONDS + (INSERT_SECONDS * (i + 1)) / 100, 0),
  ).find(
    (frame) =>
      frame.x - FLIGHT_ENVELOPE.width / 2 < RECEIVING_MOUTH.outer &&
      frame.x + FLIGHT_ENVELOPE.width / 2 > RECEIVING_MOUTH.outer,
  );
  assert.ok(crossing, 'the same envelope must cross the opening continuously');
  assert.equal(crossing.closed, false);
  const contained = deliveryFrame(FLIGHT_SECONDS + INSERT_SECONDS, 0);
  assert.ok(contained.x + FLIGHT_ENVELOPE.width / 2 <= RECEIVING_MOUTH.lip);
  assert.equal(contained.closed, true);
  assert.equal(contained.flag, false);
});
