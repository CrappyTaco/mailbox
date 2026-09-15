export const animalIds = [
  'toffee',
  'squashy',
  'wilfred',
  'lady',
  'earl',
  'nibbler',
  'noddle',
] as const;
export type AnimalId = (typeof animalIds)[number];
export type Pose =
  | 'idle'
  | 'eat'
  | 'sniff'
  | 'hop'
  | 'loaf'
  | 'sleep'
  | 'ear'
  | 'look'
  | 'surprise'
  | 'pancake'
  | 'stomp'
  | 'nose'
  | 'flight'
  | 'roost'
  | 'peck'
  | 'crest'
  | 'side-eye'
  | 'puff'
  | 'away';
export const animals: Record<
  AnimalId,
  { name: string; bird: boolean; reactions: Pose[] }
> = {
  toffee: {
    name: 'Toffee',
    bird: false,
    reactions: ['ear', 'surprise', 'look'],
  },
  squashy: {
    name: 'Squashy',
    bird: false,
    reactions: ['pancake', 'stomp', 'look'],
  },
  wilfred: {
    name: 'Wilfred',
    bird: false,
    reactions: ['ear', 'surprise', 'idle'],
  },
  lady: { name: 'Lady', bird: false, reactions: ['ear', 'sleep', 'nose'] },
  earl: { name: 'Earl', bird: false, reactions: ['look', 'ear', 'surprise'] },
  nibbler: {
    name: 'Nibbler',
    bird: true,
    reactions: ['crest', 'surprise', 'look'],
  },
  noddle: {
    name: 'Noddle',
    bird: true,
    reactions: ['side-eye', 'puff', 'away'],
  },
};
export const eventIds = [
  'toffee-squashy',
  'wilfred-lady-earl',
  'rabbit-solo',
  'rabbit-grazing',
  'birds',
  'bird-flyby',
  'bird-seeds',
] as const;
export type EventId = (typeof eventIds)[number];
export interface AnimalDevOptions {
  event?: EventId;
  reaction?: number;
  reduced?: boolean;
  speed?: number;
  mail?: boolean;
}
export function parseAnimalDev(
  params: Record<string, string | string[] | undefined>,
  enabled: boolean,
): AnimalDevOptions {
  if (!enabled) return {};
  const event = params.animalEvent;
  const reaction = Number(params.animalReaction);
  const speed = Number(params.animalSpeed);
  return {
    event: eventIds.includes(event as EventId) ? (event as EventId) : undefined,
    reaction:
      Number.isInteger(reaction) && reaction >= 0 && reaction < 3
        ? reaction
        : undefined,
    reduced: params.animalMotion === 'reduce',
    speed: [1, 2, 4].includes(speed) ? speed : 1,
    mail: params.animalMail === 'new',
  };
}
export function frameFor(
  pose: Pose,
  time: number,
  id: AnimalId,
  reduced = false,
): number {
  const tick = Math.floor(time / 160);
  if (reduced)
    return (
      (
        {
          eat: 2,
          peck: 2,
          loaf: 8,
          sleep: 9,
          pancake: 13,
          puff: 13,
          ear: 10,
          crest: 10,
          'side-eye': 11,
          look: 11,
          away: 11,
          surprise: 12,
          stomp: 7,
          nose: 15,
        } as Partial<Record<Pose, number>>
      )[pose] ?? 0
    );
  switch (pose) {
    case 'eat':
    case 'peck':
      return [0, 2, 3, 2, 0, 0][tick % 6];
    case 'sniff':
    case 'nose':
      return [0, 15, 0, 15][tick % 4];
    case 'hop':
      return [4, 5, 6, 7, 0, 0][tick % 6];
    case 'flight':
      return [4, 5, 6, 7][tick % 4];
    case 'loaf':
      return 8;
    case 'sleep':
      return 9;
    case 'pancake':
      return time < 1100 ? 13 : 8;
    case 'puff':
      return tick % 4 < 3 ? 13 : 14;
    case 'ear':
    case 'crest':
      return tick % 4 < 2 ? 10 : 14;
    case 'look':
    case 'side-eye':
    case 'away':
      return 11;
    case 'surprise':
      return animals[id].bird
        ? [10, 6, 10, 6, 0][tick % 5]
        : [4, 12, 6, 7, 0][tick % 5];
    case 'stomp':
      return tick % 4 === 1 ? 7 : 0;
    default:
      return tick % 32 === 30 ? 1 : 0;
  }
}
export function reactionSymbol(id: AnimalId, pose: Pose): string {
  if (id === 'noddle')
    return pose === 'side-eye'
      ? '…'
      : pose === 'puff'
        ? '⌁'
        : pose === 'away'
          ? '!'
          : '';
  if (pose === 'look' && id === 'squashy') return '?';
  if (pose === 'surprise' || pose === 'crest') return '!';
  return '';
}
