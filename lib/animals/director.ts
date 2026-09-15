import {
  animals,
  animalIds,
  eventIds,
  type AnimalId,
  type EventId,
  type Pose,
} from './config';
export interface CastMember {
  id: AnimalId;
  delay: number;
  target: number;
  lane: number;
}
export interface Visit {
  event: EventId;
  cast: CastMember[];
  duration: number;
  direction: 1 | -1;
  exitDirection: 1 | -1;
  elapsed: number;
}
export interface ActorSample {
  id: AnimalId;
  x: number;
  height: number;
  lane: number;
  pose: Pose;
  facing: 1 | -1;
  roof: boolean;
  opacity: number;
  elevated: boolean;
}
const pick = <T>(list: readonly T[], random: () => number) =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))];
export const quietDelay = (random: () => number, small = false) =>
  20000 + random() * (small ? 85000 : 70000);
export function createVisit(
  event: EventId,
  random: () => number,
  small = false,
  forced = false,
): Visit {
  let ids: AnimalId[];
  if (event === 'toffee-squashy') ids = ['toffee', 'squashy'];
  else if (event === 'wilfred-lady-earl')
    ids = forced
      ? ['wilfred', 'lady', 'earl']
      : pick<AnimalId[]>(
          [['wilfred'], ['lady', 'earl'], ['wilfred', 'lady', 'earl']],
          random,
        );
  else if (event === 'rabbit-solo') ids = [pick(animalIds.slice(0, 5), random)];
  else if (event === 'rabbit-grazing') ids = ['lady', 'earl'];
  else ids = ['nibbler', 'noddle'];
  // Forced full groups are still safe on phones; ordinary visits use at most two.
  if (small && !forced && ids.length > 2) ids = ids.slice(1);
  const direction = random() < 0.5 ? 1 : -1;
  const targets =
    event === 'birds'
      ? [0.49, 0.59]
      : ids.length === 3
        ? [0.18, 0.34, 0.77]
        : event === 'rabbit-grazing'
          ? [0.67, 0.82]
          : [0.18, 0.34];
  return {
    event,
    cast: ids.map((id, i) => ({
      id,
      delay: i * 650,
      target: targets[i] ?? 0.3,
      lane: i % 2,
    })),
    direction,
    exitDirection: random() < 0.7 ? direction : direction === 1 ? -1 : 1,
    duration: event === 'bird-flyby' ? 8500 : 23000 + random() * 14000,
    elapsed: 0,
  };
}
const mix = (a: number, b: number, t: number) =>
  a + (b - a) * Math.max(0, Math.min(1, t));
export function sampleActor(
  visit: Visit,
  member: CastMember,
  reduced = false,
): ActorSample | null {
  const t = visit.elapsed - member.delay,
    bird = animals[member.id].bird;
  if (t < 0) return null;
  const end = visit.duration - (visit.cast.length - 1) * 650,
    enter = bird ? 3300 : 4300,
    leave = 4000;
  const start = visit.direction === 1 ? -0.18 : 1.18,
    finish = visit.exitDirection === 1 ? 1.18 : -0.18;
  const roof = visit.event === 'birds';
  if (reduced)
    return {
      id: member.id,
      x: member.target,
      height: 0,
      lane: member.lane,
      pose: bird ? 'roost' : 'idle',
      facing: member.target > 0.5 ? -1 : 1,
      roof,
      opacity: t < end ? 1 : 0,
      elevated: false,
    };
  if (visit.event === 'bird-flyby')
    return {
      id: member.id,
      x: mix(start, visit.direction === 1 ? 1.18 : -0.18, t / end),
      height: 100 + Math.sin((t / end) * Math.PI) * 80,
      lane: 0,
      pose: 'flight',
      facing: visit.direction,
      roof: false,
      opacity: 1,
      elevated: true,
    };
  let x = member.target,
    height = 0,
    pose: Pose = bird ? 'roost' : 'idle',
    facing: 1 | -1 = member.target > 0.5 ? -1 : 1;
  const entering = t < enter,
    exiting = t > end - leave;
  if (entering || exiting) {
    const progress = entering ? t / enter : (t - end + leave) / leave;
    // Rabbits move in held hop beats; birds use low-frame wing motion.
    const step = bird ? progress : Math.floor(progress * 24) / 24;
    x = entering
      ? mix(start, member.target, step)
      : mix(member.target, finish, step);
    height = bird ? (entering ? 1 - progress : progress) * 100 : 0;
    pose = bird ? 'flight' : 'hop';
    facing = entering ? visit.direction : visit.exitDirection;
  } else {
    const beat = t - enter;
    if (visit.event === 'birds') {
      // Curious Nibbler inches closer; Noddle side-eyes, puffs, and makes room.
      pose =
        member.id === 'nibbler'
          ? beat < 4000
            ? 'crest'
            : beat < 8000
              ? 'look'
              : beat < 12000
                ? 'surprise'
                : 'roost'
          : beat < 4300
            ? 'roost'
            : beat < 7500
              ? 'side-eye'
              : beat < 10000
                ? 'puff'
                : 'roost';
      if (beat > 4000 && beat < 11000)
        x += member.id === 'nibbler' ? 0.018 : -0.01;
    } else if (visit.event === 'bird-seeds')
      pose =
        member.id === 'noddle' && beat > 5000 && beat < 7500 ? 'puff' : 'peck';
    else if (visit.event === 'toffee-squashy')
      pose =
        beat < 6000
          ? 'eat'
          : beat < 8500
            ? member.id === 'toffee'
              ? 'ear'
              : 'look'
            : beat < 14000
              ? 'loaf'
              : 'sniff';
    else
      pose =
        beat < 5000
          ? 'sniff'
          : beat < 11000
            ? 'eat'
            : beat < 17000
              ? 'loaf'
              : 'idle';
  }
  return {
    id: member.id,
    x,
    height,
    lane: member.lane,
    pose,
    facing,
    roof,
    opacity: 1,
    elevated: bird && (entering || exiting),
  };
}
export class AmbientDirector {
  visit: Visit | null = null;
  wait: number;
  reaction: Partial<
    Record<AnimalId, { pose: Pose; remaining: number; elapsed: number }>
  > = {};
  dismissed = 0;
  constructor(
    private random: () => number = Math.random,
    private small = false,
  ) {
    this.wait = quietDelay(random, small);
  }
  force(event: EventId) {
    this.visit = createVisit(event, this.random, this.small, true);
    this.reaction = {};
    this.dismissed = 0;
  }
  advance(delta: number) {
    if (this.dismissed > 0) {
      this.dismissed += delta;
      if (this.dismissed >= 600) {
        this.clear();
      }
      return;
    }
    for (const id of animalIds) {
      const r = this.reaction[id];
      if (r) {
        r.remaining -= delta;
        r.elapsed += delta;
        if (r.remaining <= 0) delete this.reaction[id];
      }
    }
    if (this.visit) {
      this.visit.elapsed += delta;
      if (this.visit.elapsed >= this.visit.duration) this.clear();
    } else {
      this.wait -= delta;
      if (this.wait <= 0) {
        if (this.random() < 0.22) {
          this.wait = quietDelay(this.random, this.small);
          return;
        }
        this.visit = createVisit(
          pick(eventIds, this.random),
          this.random,
          this.small,
        );
      }
    }
  }
  clear() {
    this.visit = null;
    this.reaction = {};
    this.dismissed = 0;
    this.wait = quietDelay(this.random, this.small);
  }
  dismiss() {
    if (this.visit && !this.dismissed) this.dismissed = 1;
  }
  react(id: AnimalId, choice?: number) {
    if (!this.visit?.cast.some((c) => c.id === id) || this.dismissed) return;
    const reactions = animals[id].reactions;
    this.reaction[id] = {
      pose:
        choice === undefined
          ? pick(reactions, this.random)
          : reactions[choice % reactions.length],
      remaining: 1800,
      elapsed: 0,
    };
  }
  arrival() {
    if (this.visit)
      for (const { id } of this.visit.cast)
        this.reaction[id] = {
          pose: animals[id].bird ? 'crest' : 'ear',
          remaining: 900,
          elapsed: 0,
        };
  }
  samples(reduced = false) {
    return (
      this.visit?.cast
        .map((member) => {
          const s = sampleActor(this.visit!, member, reduced);
          if (!s) return null;
          const r = this.reaction[s.id];
          if (r) {
            s.pose = r.pose;
            if (r.pose === 'away' && !reduced) {
              s.x += 0.035 * Math.min(1, Math.max(0, r.elapsed - 500) / 1000);
              if (r.elapsed > 900) s.facing = 1;
            }
            if (s.id === 'nibbler' && r.pose === 'look' && !reduced)
              s.facing = r.elapsed < 500 ? -1 : 1;
          }
          if (this.dismissed) {
            s.opacity = 1 - this.dismissed / 600;
            s.height += animals[s.id].bird && !reduced ? this.dismissed / 5 : 0;
            s.pose = animals[s.id].bird && !reduced ? 'flight' : 'look';
          }
          return s;
        })
        .filter((s): s is ActorSample => !!s) ?? []
    );
  }
}
