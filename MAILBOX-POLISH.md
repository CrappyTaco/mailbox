# Mailbox final polish — implementation report

Completed 2026-09-13. This pass refines the current mailbox's authored pixels and preserves its existing shell/door/flag architecture.

## 1. Files changed

Authoring and review:

- `scripts/author-mailbox-sprites.mjs`: door depth, attachment shading, lower opening/lip, rear staircase, and flag mounting pixels.
- `scripts/preview-mailbox-sprites.mjs`: all nine poses, baseline comparison, stored-letter review, and a local interactive fixture.
- `scripts/mailbox-review-client.tsx` (new): exercises the production Mailbox and motion hook with open/close/reversal, flag/letter toggles, and display-scale controls. It has no mail API calls and is not imported by the app.
- `tests/mailbox-sprites.test.ts`: adds a raster check that the closed door covers every opaque stored-envelope pixel.

Changed runtime images in `public/world/mailbox/`:

- `shell.png`
- `door-1.png` through `door-8.png`
- `doors.png`
- `flags.png`

Documentation: `public/world/mailbox/ARTWORK.md` and this report.

`door-0.png`, `letter.png`, `shell-master.png`, and `registration.json` retain their prior contents. All app/component/hook/library files and world art outside the mailbox asset directory retain their baseline hashes: **154 protected files unchanged**.

## 2. Door depth

The existing door silhouettes remain exactly unchanged. A narrow darker underside occupies two to four source-pixel rows on the lower-facing portions of the moving poses, inside the original boundary. The lower bevel and navy outer edge separate the face from its thin physical edge. The formerly bright moving rim is quieter blue, avoiding a pale hairline around the entire open door.

No door size, pivot, authored pose coordinates, frame count, animation duration, or opening direction changed. The closed door's pixels remain unchanged.

## 3. Hinge/attachment

The small folded corners at the two attachment ends receive a few shadow and highlight pixels in each moving door frame. They remain on the existing local axis `(6,72) → (40,76)` and meet the shell sill. The closed face conceals this detail.

This uses the existing door artwork. No independent hinge object, decorative strip, lock-like shape, new overlay, or gap-covering sprite was introduced.

## 4. Front opening and lower lip

The lower sill is authored along the same sloping hinge axis, with short corner returns connecting it to both jambs. This regularizes the uneven lower-edge pixels and gives the dark floor a clearer transition into the blue frame and open door.

The arched top and dark cavity remain intact. The lower lip uses restrained blue/navy pixels rather than a bright line. Existing aperture clipping and letter placement were preserved.

## 5. Rear body contour

The upper-right curve and rear/lower corner use a few smaller staircase steps. This changes 70 alpha pixels at the rear contour while preserving the shell/post bounding box. The blue-shell exterior retains its single navy outline.

Only 351 total shell pixels differ from the baseline, out of 23,053 originally opaque pixels. The post pixels and the blue panel underneath the flag are unchanged.

## 6. Flag pole and pivot

Selected lower-pole edge pixels have slightly more weight near the mounting point. The existing pivot's lower/right ring has a small contact shadow, and a few original dark edge pixels use the common navy.

The original red banner, pole/flag silhouette, pivot size/location, and frame registration remain unchanged. No new disk, halo, or surrounding shadow layer was added.

## 7. Seam/patch logic

The previous rebuild had already removed the rectangular donor patch, mixed SVG/PNG door renderer, and independent hinge strip. There was no remaining old patch logic to remove in this pass.

This pass changes the actual sprite authoring rules. It adds no copied texture rectangles or runtime repair layers. With the flag hidden, the side panel remains complete and uninterrupted. The pixel comparison confirms the area underneath the flag was not repainted.

## 8. Letter interaction and mounting

The stored envelope remains unchanged and clipped through the existing opening. Browser pose review confirmed its progressive concealment behind the closing door. The new raster test verifies complete opaque coverage in the closed state.

The production delivery component was reviewed at departure, arrival, partial insertion, full insertion, and closure. Existing passage and foreground masking still render the envelope behind the mailbox appropriately. The local review made no send/read mutations to the user's mailbox.

The wooden post's original pixels and alignment are unchanged. The body/post connection was inspected in the actual world render and showed no gap or transparency sliver.

## 9. Visual inspection

- All nine frames: approximately **0%, 10%, 25%, 37.5%, 50%, 62.5%, 75%, 90%, 100%**. The 10% and 90% inputs select the existing 12.5% and 87.5% frames.
- All poses with the flag raised and lowered, plus the stored envelope.
- Flag hidden with the door closed, the bare shell, and the fully open door.
- Actual production motion hook opening `0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8` and closing in reverse order.
- Mid-motion reversal after 225 ms: observed `0 → 1 → 2 → 1 → 0`.
- Native 224 × 308 mailbox scale, fractional desktop scale, and a smaller 140 × 192.5 scale. Opening at the smaller scale also presented every frame in order.
- Actual `/indi` world at 1280 × 720 and 900 × 560 viewports; temporary browser sizing was reset afterward.
- Direct before/after comparison of the saved baseline and polished mailbox under matching lighting and registration.

The reviewed poses showed attached door edges, consistent shading at the joint, no reopened side-panel seam, and no rectangular repair boundary. The authored stepped animation and its existing timing were retained.

## 10. Tests and verification

**37 mailbox-related tests passed, 0 failed**, from:

```text
tests/mailbox-sprites.test.ts
tests/mailbox-geometry.test.ts
tests/envelope-motion.test.ts
tests/state.test.ts
tests/corrections.test.ts
tests/world-time.test.ts
tests/world-art.test.ts
```

Coverage includes connected door silhouettes, opaque hinge coverage, binary alpha, the former seam area, common raster rendering, closed-envelope coverage, letter motion/containment, delivery timing, mailbox states, and world-art integrity.

TypeScript passed after regenerating stale local Next route types with `next typegen`. Oxlint passed for all changed code/test files. The local Vite review bundle built successfully. No production renderer or world code changed.

Independent baseline checks passed for all 154 protected files, original post pixels, body/post bounds, all door and flag silhouettes, closed-door pixels, red flag banner, blue panel under the flag, envelope asset, and pose/pivot registration.

## Review files

- Before/after image: `.local/mailbox-polish/comparison.png`
- Detailed after image: `.local/mailbox-polish/after-enlarged.png`
- Verification results: `.local/mailbox-polish/verification.json`
- Pixel change counts: `.local/mailbox-polish/pixel-changes.json`
- Baseline assets/source backups: `.local/mailbox-polish/before/`

Start the isolated review using:

```sh
node --import ./scripts/register-tests.mjs scripts/preview-mailbox-sprites.mjs 3190
```

Then open `http://127.0.0.1:3190/?set=compare` or `?set=motion`.
