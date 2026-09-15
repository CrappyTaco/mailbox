import { postalPortrait } from './postal-portraits.mjs';
import { png } from './build-animal-sprites.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const ids = [
  'toffee',
  'earl',
  'wilfred',
  'squashy',
  'nibbler',
  'noddle',
  'lady',
  'flower',
  'mailbox',
  'clover',
];
const backgrounds = [
  '#e4d3b7',
  '#d8d9cc',
  '#d6d0da',
  '#e5d4cf',
  '#d5dacc',
  '#ddd5df',
  '#d6dce0',
  '#e6d0cc',
  '#d3dbe1',
  '#d8dfc2',
];
await mkdir('public/stamps', { recursive: true });
for (let k = 0; k < ids.length; k++) {
  const id = ids[k],
    pixels = Array(48 * 60).fill(null);
  const rect = (x, y, w, h, color) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && j >= 0 && i < 48 && j < 60) pixels[j * 48 + i] = color;
  };
  rect(0, 0, 48, 60, '#f3e8cc');
  rect(3, 3, 42, 54, '#b8a38b');
  rect(4, 4, 40, 52, '#f3e8cc');
  rect(6, 6, 36, 44, backgrounds[k]);
  for (let n = 3; n < 48; n += 6) {
    rect(n, 0, 2, 2, null);
    rect(n, 58, 2, 2, null);
  }
  for (let n = 3; n < 60; n += 6) {
    rect(0, n, 2, 2, null);
    rect(46, n, 2, 2, null);
  }
  rect(8, 52, 16, 1, '#9b8273');
  rect(8, 54, 10, 1, '#b29b82');
  rect(35, 52, 2, 4, '#927b70');
  rect(33, 52, 2, 1, '#927b70');
  rect(33, 55, 6, 1, '#927b70');
  if (k < 7) {
    postalPortrait(id, rect);
  } else if (id === 'mailbox') {
    rect(21, 33, 6, 15, '#906b54');
    rect(22, 34, 2, 13, '#b58b64');
    rect(11, 17, 26, 18, '#4a414b');
    rect(14, 13, 20, 5, '#4a414b');
    rect(13, 18, 22, 15, '#577b9f');
    rect(16, 15, 16, 5, '#799ab5');
    rect(13, 19, 8, 14, '#32465e');
    rect(14, 20, 5, 10, '#e8d9ba');
    rect(25, 12, 3, 16, '#9f5363');
    rect(28, 12, 7, 6, '#bb7480');
    rect(10, 34, 11, 3, '#4a414b');
    rect(11, 34, 8, 2, '#799ab5');
  } else if (id === 'flower') {
    rect(23, 25, 2, 19, '#627957');
    rect(17, 32, 6, 3, '#819764');
    rect(25, 36, 6, 3, '#819764');
    rect(18, 12, 12, 18, '#a66270');
    rect(14, 16, 20, 10, '#a66270');
    rect(19, 13, 10, 16, '#d2979f');
    rect(15, 17, 18, 8, '#d2979f');
    rect(21, 17, 6, 8, '#f0d29c');
    rect(20, 19, 8, 4, '#f0d29c');
    rect(22, 19, 4, 4, '#bf975f');
  } else {
    rect(23, 28, 2, 16, '#627957');
    rect(22, 41, 2, 5, '#627957');
    for (const [x, y] of [
      [14, 15],
      [24, 15],
      [14, 25],
      [24, 25],
    ]) {
      rect(x, y, 9, 9, '#576b50');
      rect(x + 1, y + 1, 7, 7, '#80986a');
      rect(x + 2, y + 1, 3, 2, '#a4b281');
    }
    rect(22, 23, 4, 4, '#576b50');
  }
  await writeFile(`public/stamps/${id}.png`, png(48, 60, pixels));
}
console.log('Built ten original perforated pixel postage stamps.');
