import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deliveryFrame,
  FLIGHT_SECONDS,
  INSERT_SECONDS,
  CONTAINED_SECONDS,
  CLOSE_SECONDS,
  READY_SECONDS,
  RECEIVING_MOUTH,
  FLIGHT_ENVELOPE,
  DEPARTURE_SECONDS,
  mailboxLetterCenter,
} from '../lib/delivery';
import { MAILBOX_ART, DELIVERY_GLOBE } from '../lib/world-style';
import { mailboxFloorAt } from '../lib/mailbox-geometry';

void test('stored envelope rests on the sill and both post anchors meet the globe surface', () => {
  const { stored, globe, ground, postTip } = MAILBOX_ART;
  const gap = mailboxFloorAt(stored.x) - stored.y - stored.height;
  assert.ok(gap >= 0 && gap < 0.5, `floor contact gap: ${gap}`);
  assert.equal(globe.x + ground.x * globe.scale, DELIVERY_GLOBE.centerX);
  assert.equal(globe.y + ground.y * globe.scale, DELIVERY_GLOBE.y);
  assert.ok(globe.y + postTip.y * globe.scale > DELIVERY_GLOBE.y);
  assert.equal(FLIGHT_ENVELOPE.width, stored.width * globe.scale);
  assert.equal(FLIGHT_ENVELOPE.height, stored.height * globe.scale);
});

void test('local envelope and world flight meet without position, size or rotation jumps', () => {
  const departing = mailboxLetterCenter(MAILBOX_ART.exitX);
  const arriving = mailboxLetterCenter(MAILBOX_ART.exitX, true);
  assert.ok(
    MAILBOX_ART.exitX + MAILBOX_ART.stored.width < MAILBOX_ART.mouth.left,
  );
  for (const [time, point, angle] of [
    [DEPARTURE_SECONDS, departing, 0],
    [FLIGHT_SECONDS, arriving, -180],
  ] as const) {
    for (const delta of [-0.000001, 0, 0.000001]) {
      const frame = deliveryFrame(time + delta, null);
      assert.ok(Math.hypot(frame.x - point.x, frame.y - point.y) < 0.00001);
      assert.ok(Math.abs(frame.angle - angle) < 0.00001);
    }
  }
});

void test('letter holds inside before closure, including late server acknowledgement', () => {
  assert.equal(
    deliveryFrame(READY_SECONDS / 2, null).x,
    deliveryFrame(0, null).x,
  );
  for (const acknowledgement of [0, FLIGHT_SECONDS + 5]) {
    const receipt = Math.max(FLIGHT_SECONDS, acknowledgement);
    const contained = deliveryFrame(
      receipt + INSERT_SECONDS - CONTAINED_SECONDS / 2,
      acknowledgement,
    );
    assert.equal(contained.doorProgress, 1);
    assert.equal(contained.flagProgress, 0);
    assert.ok(contained.x + FLIGHT_ENVELOPE.width / 2 <= RECEIVING_MOUTH.lip);
    const closing = deliveryFrame(
      receipt + INSERT_SECONDS + CLOSE_SECONDS / 2,
      acknowledgement,
    );
    assert.equal(
      closing.x,
      contained.x,
      'contained letter cannot jump when closure begins',
    );
    assert.ok(closing.doorProgress > 0 && closing.doorProgress < 1);
    assert.equal(
      closing.flagProgress,
      0,
      'raise the flag only after the panel closes',
    );
  }
});
