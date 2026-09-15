import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorldLandscape } from '../components/world/WorldLandscape';
// Vinext declares the optional production sharp import as unknown. The test
// uses the installed Node raster reader through its small, verified interface.
const sharp = createRequire(import.meta.url)('sharp') as (
  path: string | Buffer,
) => {
  ensureAlpha(): {
    raw(): {
      toBuffer(options: {
        resolveWithObject: true;
      }): Promise<{ data: Buffer; info: { width: number; height: number } }>;
    };
  };
};

void test('legacy sprites contain only opaque palette pixels and transparent background, without alpha halos', async () => {
  for (const file of (await readdir('public/world')).filter((file) =>
    file.endsWith('.png'),
  )) {
    const { data } = await sharp(`public/world/${file}`)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const colors = new Set<number>();
    for (let i = 0; i < data.length; i += 4) {
      assert.ok(
        data[i + 3] === 0 || data[i + 3] === 255,
        `${file}: translucent pixel`,
      );
      if (data[i + 3]) colors.add(data.readUInt32BE(i));
    }
    assert.ok(colors.size <= 24, `${file}: uncontrolled palette`);
  }
});
void test('rendered scene assets preserve native dimensions and opaque coverage', async () => {
  // Browser composition and masks are exercised by review-reference-scene;
  // inspect each underlying texture once here instead of decoding every crop.
  const svg = renderToStaticMarkup(createElement(WorldLandscape));
  const assets = new Set(
    [...svg.matchAll(/href="(\/world\/[^"]+)"/g)].map((match) => match[1]),
  );
  assert.ok(assets.size > 0, 'the scene must reference its artwork');
  for (const asset of assets) {
    const { data, info } = await sharp('public' + asset)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(
      [info.width, info.height],
      [1786, asset.endsWith('target-clean.png') ? 881 : 880],
      asset,
    );
    for (let i = 3; i < data.length; i += 4)
      assert.equal(data[i], 255, `${asset}: transparent hole`);
  }
});
