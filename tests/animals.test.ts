import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AmbientDirector,
  createVisit,
  quietDelay,
  sampleActor,
} from '../lib/animals/director';
import {
  animals,
  animalIds,
  eventIds,
  frameFor,
  parseAnimalDev,
} from '../lib/animals/config';
import { spriteFrame, names, SIZE } from '../scripts/build-animal-sprites.mjs';
const random = () => 0.6;
void test('animal debug overrides are absent outside local preview', () => {
  assert.deepEqual(
    parseAnimalDev(
      {
        animalEvent: 'birds',
        animalReaction: '2',
        animalSpeed: '4',
        animalMail: 'new',
      },
      false,
    ),
    {},
  );
  assert.equal(
    parseAnimalDev({ animalEvent: 'not-real' }, true).event,
    undefined,
  );
});
void test('every group enters, dwells, leaves the screen, then has a quiet gap', () => {
  for (const event of eventIds) {
    const visit = createVisit(event, random, false, true);
    assert.ok(visit.cast.length <= 3);
    assert.equal(
      sampleActor(visit, visit.cast[1] ?? { ...visit.cast[0], delay: 1 }),
      null,
    );
    for (const member of visit.cast) {
      visit.elapsed = member.delay;
      const entrance = sampleActor(visit, member)!;
      assert.ok(entrance.x < 0 || entrance.x > 1);
      visit.elapsed = visit.duration - 1;
      const exit = sampleActor(visit, member)!;
      assert.ok(exit.x < 0 || exit.x > 1);
    }
    const d = new AmbientDirector(random);
    d.force(event);
    d.advance(45000);
    assert.equal(d.visit, null);
    assert.ok(d.wait >= 20000);
  }
});
void test('mobile normal groups are capped and all seven occur in their configured groups', () => {
  const seen = new Set();
  for (const event of eventIds) {
    for (const c of createVisit(event, random, false, true).cast)
      seen.add(c.id);
    assert.ok(createVisit(event, () => 0.99, true).cast.length <= 2);
  }
  assert.equal(seen.size, 7);
});
void test('flybys cross the visible sky even when the random exit chooses the entry side', () => {
  for (const n of [0.1, 0.6, 0.95]) {
    const v = createVisit('bird-flyby', () => n);
    v.elapsed = v.duration / 2;
    for (const member of v.cast) {
      const s = sampleActor(v, member)!;
      assert.ok(s.x > 0.1 && s.x < 0.9);
      assert.equal(s.pose, 'flight');
    }
  }
});
void test('every character has three bounded reactions and valid sprite frames', () => {
  for (const id of animalIds) {
    const event = animals[id].bird
      ? 'birds'
      : id === 'toffee' || id === 'squashy'
        ? 'toffee-squashy'
        : 'wilfred-lady-earl';
    for (let choice = 0; choice < 3; choice++) {
      const d = new AmbientDirector(random);
      d.force(event);
      d.advance(6000);
      d.react(id, choice);
      assert.equal(
        d.samples().find((s) => s.id === id)?.pose,
        animals[id].reactions[choice],
      );
      for (const t of [0, 200, 900, 1500]) {
        const f = frameFor(animals[id].reactions[choice], t, id);
        assert.ok(f >= 0 && f < 16);
      }
      d.advance(1900);
      assert.equal(d.reaction[id], undefined);
    }
  }
});
void test('mail arrival perks residents; opening evacuates all in under a second', () => {
  const d = new AmbientDirector(random);
  d.force('birds');
  d.advance(5000);
  d.arrival();
  assert.equal(d.samples()[0].pose, 'crest');
  d.dismiss();
  d.advance(250);
  assert.ok(d.samples()[0].opacity < 1);
  d.advance(400);
  assert.equal(d.visit, null);
  assert.ok(d.wait >= 20000);
});
void test('reduced motion holds a static roost or seat without travel frames', () => {
  const v = createVisit('birds', random);
  v.elapsed = 6000;
  const a = sampleActor(v, v.cast[0], true)!;
  v.elapsed = 15000;
  const b = sampleActor(v, v.cast[0], true)!;
  assert.equal(a.x, b.x);
  assert.equal(a.pose, 'roost');
  assert.equal(a.height, 0);
  assert.equal(
    frameFor('idle', 0, 'lady', true),
    frameFor('idle', 5000, 'lady', true),
  );
  const d = new AmbientDirector(random);
  d.force('birds');
  d.advance(6000);
  d.react('noddle', 2);
  const before = d.samples(true).find((s) => s.id === 'noddle')!;
  d.advance(1200);
  const after = d.samples(true).find((s) => s.id === 'noddle')!;
  assert.equal(before.x, after.x);
  d.dismiss();
  d.advance(200);
  assert.equal(d.samples(true)[0].height, 0);
});
void test('quiet intervals stay calm and a skipped visit restarts a quiet interval', () => {
  assert.equal(
    quietDelay(() => 0),
    20000,
  );
  assert.equal(
    quietDelay(() => 1),
    90000,
  );
  const d = new AmbientDirector(() => 0.1);
  d.advance(100000);
  assert.equal(d.visit, null);
  assert.ok(d.wait >= 20000);
});
void test('sprite frames are exact grids with transparent margins and a bounded shared palette', () => {
  for (const id of names) {
    for (let f = 0; f < 16; f++) {
      const pixels = spriteFrame(id, f);
      assert.equal(pixels.length, SIZE * SIZE);
      assert.ok(pixels.some((p) => p === null));
      assert.ok(
        pixels.slice(0, SIZE).every((p) => p === null),
        `${id}/${f} clips top`,
      );
      assert.ok(
        pixels.slice(-SIZE).every((p) => p === null),
        `${id}/${f} clips bottom`,
      );
      assert.ok(new Set(pixels.filter(Boolean)).size <= 18);
      assert.ok(pixels.every((p) => p === null || /^#[0-9a-f]{6}$/i.test(p)));
    }
  }
  // Clean cream bib vs Wilfred's patterned coat stay different in all applicable poses.
  for (const f of [0, 1, 2, 8, 9])
    assert.notDeepEqual(spriteFrame('squashy', f), spriteFrame('wilfred', f));
  for (const id of names)
    assert.notDeepEqual(
      spriteFrame(id, 0),
      spriteFrame(id, 11),
      `${id} must visibly look`,
    );
});
