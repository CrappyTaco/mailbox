import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mailbox } from '../components/mailbox/Mailbox';
import { MAILBOX_HINGE } from '../lib/mailbox-geometry';
import { MAILBOX_ART } from '../lib/world-style';
import {
  MAILBOX_SHELL,
  MAILBOX_SPRITES,
  mailboxSpriteFrame,
} from '../lib/mailbox-sprites';

const sharp = createRequire(import.meta.url)('sharp') as (path: string) => {
  ensureAlpha(): {
    raw(): {
      toBuffer(options: {
        resolveWithObject: true;
      }): Promise<{ data: Buffer; info: { width: number; height: number } }>;
    };
  };
};
const raster = (name: string) =>
  sharp('public/world/mailbox/' + name)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

void test('each door drawing is one connected opaque silhouette attached along the shared sill', async () => {
  const { width: W, height: H, scale } = MAILBOX_SHELL;
  const { frames } = MAILBOX_SPRITES;
  for (let frame = 0; frame < frames; frame++) {
    const { data, info } = await raster(`door-${frame}.png`);
    assert.deepEqual([info.width, info.height], [W, H]);
    const remaining = new Set<number>();
    for (let p = 0; p < W * H; p++) {
      const alpha = data[p * 4 + 3];
      assert.ok(
        alpha === 0 || alpha === 255,
        `frame ${frame}: fractional alpha`,
      );
      if (alpha) remaining.add(p);
    }
    for (
      let px = MAILBOX_HINGE.x + 1;
      px < MAILBOX_HINGE.x + MAILBOX_HINGE.width;
      px++
    ) {
      const py =
        MAILBOX_HINGE.y +
        ((px - MAILBOX_HINGE.x) * MAILBOX_HINGE.rise) / MAILBOX_HINGE.width;
      const x = Math.floor((px - MAILBOX_SHELL.x) / scale),
        y = Math.floor((py - MAILBOX_SHELL.y) / scale);
      // A flap crosses from above to below the hinge when it opens. Test the
      // attachment on either side, rather than requiring an artificial bar.
      assert.ok(
        [-1, 0, 1].some((dy) => data[((y + dy) * W + x) * 4 + 3] === 255),
        `frame ${frame}: gap at hinge ${px}`,
      );
    }
    const first = remaining.values().next().value;
    assert.ok(first !== undefined);
    const queue = [first];
    remaining.delete(first);
    for (let n = 0; n < queue.length; n++) {
      const p = queue[n],
        x = p % W,
        y = Math.floor(p / W);
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          next = ny * W + nx;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H && remaining.delete(next))
          queue.push(next);
      }
    }
    assert.equal(remaining.size, 0, `frame ${frame}: detached pixels`);
  }
});

void test('extraction preserves every dark source pixel and every retained RGB value', async () => {
  const [master, shell] = await Promise.all([
    raster('shell-border-master.png'),
    raster('shell.png'),
  ]);
  assert.deepEqual(
    [shell.info.width, shell.info.height],
    [master.info.width, master.info.height],
  );
  let removed = 0;
  for (let i = 0; i < master.data.length; i += 4) {
    assert.ok(shell.data[i + 3] === 0 || shell.data[i + 3] === 255);
    if (shell.data[i + 3]) {
      assert.equal(shell.data[i], master.data[i]);
      assert.equal(shell.data[i + 1], master.data[i + 1]);
      assert.equal(shell.data[i + 2], master.data[i + 2]);
    } else {
      removed++;
      const channels = [...master.data.subarray(i, i + 3)];
      assert.ok(
        Math.min(...channels) >= 140,
        `artwork removed at pixel ${i / 4}`,
      );
      assert.ok(Math.max(...channels) - Math.min(...channels) <= 32);
    }
  }
  assert.ok(removed > 1_000_000, 'opaque checkerboard must be removed');
  assert.equal(shell.data[3], 0);
});

void test('the seated door leaves the approved front rim and sill exposed', async () => {
  const [shell, door] = await Promise.all([
    raster('shell.png'),
    raster('door-0.png'),
  ]);
  for (const [x, y] of [
    [287, 500],
    [570, 450],
    [420, 278],
    [510, 325],
    [430, 675],
  ]) {
    const i = (y * shell.info.width + x) * 4;
    assert.equal(shell.data[i + 3], 255, `rim missing at ${x},${y}`);
    assert.equal(door.data[i + 3], 0, `door covers rim at ${x},${y}`);
  }
});

void test('the seated door fills the cavity crescent up to the inner curved rim', async () => {
  const { data, info } = await raster('door-0.png');
  for (const [x, y] of [
    [485, 310],
    [498, 320],
    [510, 330],
    [529, 355],
  ]) {
    assert.equal(
      data[(y * info.width + x) * 4 + 3],
      255,
      `exposed cavity would create a second seam at ${x},${y}`,
    );
  }
});

void test('cavity and exterior are disjoint pieces of the original shell with no seams or added pixels', async () => {
  const [shell, interior, exterior] = await Promise.all([
    raster('shell.png'),
    raster('interior.png'),
    raster('exterior.png'),
  ]);
  for (let i = 0; i < shell.data.length; i += 4) {
    assert.equal(
      interior.data[i + 3] + exterior.data[i + 3],
      shell.data[i + 3],
    );
    for (const layer of [interior, exterior]) {
      if (!layer.data[i + 3]) continue;
      assert.ok(
        layer.data.subarray(i, i + 4).equals(shell.data.subarray(i, i + 4)),
      );
    }
  }
});

void test('far jamb is behind the letter while the near jamb stays in front', async () => {
  const [interior, exterior] = await Promise.all([
    raster('interior.png'),
    raster('exterior.png'),
  ]);
  for (const [x, y, foreground] of [
    [280, 500, false],
    [570, 500, true],
  ] as const) {
    const alpha = (y * exterior.info.width + x) * 4 + 3;
    assert.equal(exterior.data[alpha], foreground ? 255 : 0);
    assert.equal(interior.data[alpha], foreground ? 0 : 255);
  }
});

void test('all states use one shell and the same raster door system without deformation', () => {
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    const html = renderToStaticMarkup(
      createElement(Mailbox, {
        doorProgress: progress,
        flagVisible: false,
        showLetter: false,
      }),
    );
    assert.equal((html.match(/class="mailbox-shell /g) ?? []).length, 1);
    assert.ok(html.includes(MAILBOX_SPRITES.interior));
    assert.ok(html.includes(MAILBOX_SPRITES.exterior));
    assert.ok(html.includes(MAILBOX_SPRITES.doors));
    assert.ok(
      html.includes(`data-door-frame="${mailboxSpriteFrame(progress)}"`),
    );
    assert.ok(!html.includes('matrix('));
    assert.ok(!html.includes('mailbox-hinge"'));
    assert.ok(!html.includes('reference/target.png'));
    assert.ok(!html.includes('mailbox-pivot-flag'));
  }
  assert.equal(mailboxSpriteFrame(-1), 0);
  assert.equal(mailboxSpriteFrame(2), 8);
  assert.equal(mailboxSpriteFrame(Number.NaN), 0);
});

void test('closed door pixels fully cover the stored envelope', async () => {
  const [door, letter] = await Promise.all([
    raster('door-0.png'),
    raster('letter.png'),
  ]);
  // Convert stored-envelope pixels to the approved master's registration.
  for (let y = 0; y < letter.info.height; y++)
    for (let x = 0; x < letter.info.width; x++) {
      if (!letter.data[(y * letter.info.width + x) * 4 + 3]) continue;
      const dx = Math.floor(
        (MAILBOX_ART.stored.x + (x + 0.5) * 0.5 - MAILBOX_SHELL.x) /
          MAILBOX_SHELL.scale,
      );
      const dy = Math.floor(
        (MAILBOX_ART.stored.y + (y + 0.5) * 0.5 - MAILBOX_SHELL.y) /
          MAILBOX_SHELL.scale,
      );
      assert.equal(
        door.data[(dy * door.info.width + dx) * 4 + 3],
        255,
        `stored envelope exposed through closed door at ${x},${y}`,
      );
    }
});
