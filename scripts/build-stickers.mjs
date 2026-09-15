import { png } from './build-animal-sprites.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
const names = [
  'red heart',
  'pink heart',
  'daisy',
  'tulip',
  'happy face',
  'angry face',
  'sad face',
  'blushing face',
  'sparkles',
  'little bow',
];
const stickers = [];
await mkdir('public/stickers', { recursive: true });
for (const [index, name] of names.entries()) {
  const pixels = Array(32 * 32).fill(null);
  const rect = (x, y, w, h, c) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < 32 && j >= 0 && j < 32) pixels[j * 32 + i] = c;
  };
  const ink = '#69494f',
    pink = '#d78091',
    red = '#be5168',
    cream = '#fff6df',
    gold = '#e5b968',
    green = '#597b55';
  if (index < 2) {
    const rows = [
      '.xxxx..xxxx.',
      'xxxxxxxxxxxx',
      'xxxxxxxxxxxx',
      'xxxxxxxxxxxx',
      '.xxxxxxxxxx.',
      '..xxxxxxxx..',
      '...xxxxxx...',
      '....xxxx....',
      '.....xx.....',
    ];
    rows.forEach((row, y) =>
      row.split('').forEach((c, x) => {
        if (c === 'x')
          rect(4 + x * 2, 6 + y * 2, 2, 2, index === 0 ? red : pink);
      }),
    );
    rect(8, 8, 4, 2, index === 0 ? '#e28991' : '#efb2c0');
    rect(6, 10, 2, 4, index === 0 ? '#e28991' : '#efb2c0');
  } else if (index === 2 || index === 3) {
    rect(15, 15, 2, 13, green);
    rect(9, 20, 6, 3, green);
    rect(7, 18, 4, 3, green);
    rect(17, 23, 5, 3, green);
    rect(21, 21, 3, 3, green);
    if (index === 2) {
      rect(13, 3, 6, 8, cream);
      rect(4, 10, 9, 6, cream);
      rect(19, 10, 9, 6, cream);
      rect(13, 16, 6, 7, cream);
      rect(9, 7, 14, 12, cream);
      rect(12, 10, 8, 7, gold);
      rect(14, 10, 3, 3, '#f5d78f');
    } else {
      rect(8, 5, 4, 11, red);
      rect(12, 9, 8, 10, red);
      rect(20, 5, 4, 11, red);
      rect(11, 15, 10, 5, red);
      rect(13, 6, 6, 13, pink);
      rect(9, 6, 2, 8, '#eca0a6');
    }
  } else if (index < 8) {
    const skin = index === 5 ? '#d9977e' : '#e8c57d';
    rect(10, 4, 12, 24, skin);
    rect(6, 8, 20, 16, skin);
    rect(4, 11, 24, 10, skin);
    rect(9, 8, 3, 2, '#f4dba6');
    rect(7, 10, 2, 5, '#f4dba6');
    rect(10, 12, 2, 4, ink);
    rect(20, 12, 2, 4, ink);
    if (index === 4 || index === 7) {
      rect(12, 21, 8, 2, ink);
      rect(10, 18, 2, 3, ink);
      rect(20, 18, 2, 3, ink);
    }
    if (index === 5) {
      rect(8, 9, 4, 2, ink);
      rect(12, 10, 2, 2, ink);
      rect(20, 9, 4, 2, ink);
      rect(18, 10, 2, 2, ink);
      rect(12, 21, 8, 2, ink);
    }
    if (index === 6) {
      rect(12, 20, 8, 2, ink);
      rect(10, 22, 2, 2, ink);
      rect(20, 22, 2, 2, ink);
      rect(22, 17, 2, 3, '#7eafbd');
      rect(22, 20, 2, 2, '#a2cbd0');
    }
    if (index === 7) {
      rect(6, 17, 5, 3, pink);
      rect(21, 17, 5, 3, pink);
    }
  } else if (index === 8) {
    for (const [x, y, s] of [
      [15, 13, 3],
      [6, 24, 1],
      [26, 6, 1],
    ]) {
      rect(x - s, y - s, s * 2 + 1, s * 2 + 1, gold);
      rect(x, y - s * 3, 1, s * 6 + 1, gold);
      rect(x - s * 3, y, s * 6 + 1, 1, gold);
      rect(x, y - s, 1, s * 2 + 1, cream);
    }
  } else {
    rect(4, 8, 4, 14, red);
    rect(8, 10, 5, 10, pink);
    rect(13, 12, 6, 8, red);
    rect(19, 10, 5, 10, pink);
    rect(24, 8, 4, 14, red);
    rect(10, 20, 4, 7, red);
    rect(8, 25, 4, 3, red);
    rect(18, 20, 4, 7, red);
    rect(20, 25, 4, 3, red);
    rect(14, 13, 4, 6, '#eca5ae');
    rect(5, 9, 2, 8, '#eaa0af');
    rect(25, 9, 2, 8, '#eaa0af');
  }
  // One-pixel paper edge around the silhouette, preserving transparent corners.
  const outlined = pixels.slice();
  pixels.forEach((c, n) => {
    if (c)
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const x = (n % 32) + dx,
          y = Math.floor(n / 32) + dy;
        if (x >= 0 && x < 32 && y >= 0 && y < 32 && !pixels[y * 32 + x])
          outlined[y * 32 + x] = cream;
      }
  });
  const buffer = png(32, 32, outlined);
  await writeFile(
    'public/stickers/' + name.replaceAll(' ', '-') + '.png',
    buffer,
  );
  stickers.push({
    name,
    asset: 'data:image/png;base64,' + buffer.toString('base64'),
  });
}
await writeFile(
  'lib/builtin-stickers.ts',
  '// Original 32px sticker art. Regenerate with node scripts/build-stickers.mjs.\nexport const builtinStickers = ' +
    JSON.stringify(stickers, null, 2) +
    ' as const;\n',
);
console.log('Built ten original pixel stickers.');
