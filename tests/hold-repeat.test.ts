import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HoldRepeat } from '../lib/hold-repeat';
void test('a quick press makes one step and a hold repeats after its delay until released', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let steps = 0,
    begins = 0,
    ends = 0;
  const hold = new HoldRepeat(
    () => steps++,
    () => begins++,
    () => ends++,
  );
  hold.start();
  t.mock.timers.tick(120);
  hold.stop();
  t.mock.timers.tick(1000);
  assert.deepEqual([steps, begins, ends], [1, 1, 1]);
  hold.start();
  hold.start();
  t.mock.timers.tick(279);
  assert.equal(steps, 2);
  t.mock.timers.tick(1);
  assert.equal(steps, 3);
  for (let i = 0; i < 120; i++) t.mock.timers.tick(50);
  assert.equal(steps, 123);
  hold.stop();
  hold.stop();
  t.mock.timers.tick(2000);
  assert.deepEqual([steps, begins, ends], [123, 2, 2]);
});
void test('cancelling before the repeat delay and replacing selection leaves no runaway callback', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let first = 0,
    second = 0;
  const a = new HoldRepeat(
      () => first++,
      () => {},
      () => {},
    ),
    b = new HoldRepeat(
      () => second++,
      () => {},
      () => {},
    );
  a.start();
  t.mock.timers.tick(200);
  a.stop();
  b.start();
  t.mock.timers.tick(280);
  b.stop();
  t.mock.timers.tick(5000);
  assert.deepEqual([first, second], [1, 2]);
});
