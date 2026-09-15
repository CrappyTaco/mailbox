import { mixColor } from './world-time';

// Matched material pairs keep the same scene recognizable in daylight and moonlight.
const materials = {
  outline: ['#293044', '#171c39'],
  metalDark: ['#4a6092', '#34446e'],
  metal: ['#5b73aa', '#435790'],
  metalLight: ['#768fbb', '#526c9e'],
  metalEdge: ['#90a4c2', '#a2bbd1'],
  interior: ['#252d48', '#1a2241'],
  interiorBack: ['#343956', '#202c4b'],
  silver: ['#bbc7ce', '#8696a5'],
  silverShade: ['#788799', '#536478'],
  flag: ['#c95268', '#ad3d56'],
  flagLight: ['#ee8387', '#ea6a72'],
  post: ['#9c747d', '#604652'],
  postLight: ['#b58a89', '#7a5864'],
  postShade: ['#785463', '#493645'],
  hills: ['#8fb0b5', '#304863'],
  trees: ['#567775', '#1d343e'],
  field: ['#9eaf7b', '#465b50'],
  fieldLight: ['#b1bf89', '#566b5b'],
  middle: ['#819366', '#354e45'],
  grass: ['#586e50', '#223b36'],
  grassLight: ['#6f865f', '#39574a'],
  grassDark: ['#3f5947', '#1b3332'],
  path: ['#b7a28b', '#726d68'],
  pathShade: ['#a18b7c', '#5c5b59'],
  flower: ['#fff7dd', '#c1ccbf'],
  pollen: ['#dfb461', '#a2956d'],
  stone: ['#818ba2', '#4b5772'],
  stoneLight: ['#a0a7b6', '#697791'],
  stoneShade: ['#5f6984', '#34435c'],
} as const;

export function worldMaterials(night: number, warmth = 0) {
  return Object.fromEntries(
    Object.entries(materials).map(([name, [day, dark]]) => {
      const color = mixColor(day, dark, night);
      return [`--world-${name}`, mixColor(color, '#cf9c83', warmth * 0.18)];
    }),
  );
}

export const material = (name: keyof typeof materials) =>
  `var(--world-${name}, ${materials[name][0]})`;
