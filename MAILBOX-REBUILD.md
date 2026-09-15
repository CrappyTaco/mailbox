# Mailbox rendering rebuild — technical handoff

Updated 2026-09-12. This describes the completed mailbox-only rebuild in `C:/Users/crapp/Desktop/Our_mailbox`.

## Result and scope

The mailbox now renders as one finished shell sprite, one nine-frame door animation, and one separate nine-frame flag animation. The former blue donor rectangle, SVG/PNG door switch, affine door deformation, and separate stationary hinge overlay were removed.

The current blue palette, left-facing perspective, registered outer body silhouette, source post, source flag design, mailbox placement, and opening direction were retained. The blue shell surface and door states are newly finished artwork; they are not pixel-identical copies of every old interior/detail pixel.

World artwork, CSS, camera, framing, and scene scale were not edited. SHA-256 checks confirmed all 13 protected world files match their pre-rebuild versions.

The earlier `WORLD-RENDERING-DIAGNOSTIC.md` is the historical explanation of the implementation before this rebuild.

## What caused the original line

The specific line was on the large blue side panel, just left of the flag pivot, rather than the pole or the arched front rim.

In the previous `components/mailbox/ReferenceMailboxParts.tsx`, `MailboxShell` erased the embedded flag area and copied a rectangular blue donor region from approximately source x=926–944, y=466–527, translating it left by 20 source pixels. That put the copied rectangle's left boundary at approximately source x=906.

The donor's shading did not continue the surrounding roof/side shading. Its rectangular boundary therefore read as a narrow light seam. The source pixels and the compositing boundary were responsible; a new CSS border was not the cause. The finished shell now contains the entire roof, rim, side, and cavity in one PNG and makes no runtime donor copy.

## Active files

| File | Responsibility |
| --- | --- |
| `components/mailbox/Mailbox.tsx` | Shell/letter/door/flag ordering; existing mail state behavior; letter passage clipping; delivery foreground occlusion |
| `components/mailbox/MailboxParts.tsx` | Displays the shell and selects registered PNG atlas cells for the door and flag |
| `components/mailbox/ReferenceMailboxParts.tsx` | Compatibility re-export; contains no old patch renderer |
| `lib/mailbox-sprites.ts` | Shared asset paths, cell size, registration, and progress-to-frame selection |
| `lib/mailbox-geometry.ts` | Shared hinge axis, opening silhouette, and mouth geometry used by letters/delivery |
| `hooks/use-sprite-motion.ts` | Stepped reversible door/flag timing and reduced-motion behavior |
| `scripts/author-mailbox-sprites.mjs` | Offline asset preparation and deliberate door-frame authoring |
| `scripts/preview-mailbox-sprites.mjs` | Isolated browser pose review using the production components, without mail API calls |
| `public/world/mailbox/ARTWORK.md` | Source provenance, exact image-edit prompt, and regeneration command |

## Shell artwork

`public/world/mailbox/shell.png` is a single 272 × 308 RGBA sprite. It includes the blue roof and side, stepped arched front rim, dark empty cavity, lower sill, and wooden post.

The shell master was created with the built-in image-generation edit tool from a crop of the existing reference artwork. The offline authoring script registers it to the existing outer mailbox silhouette. It preserves the original post pixels from source y ≥ 574. It applies a common dark outline at the blue shell's exterior edge, preventing remnants of the old embedded red flag from surviving there.

The exterior silhouette mask is an outline cutout around the complete object. There is no interior rectangular donor region, patch layer, gradient, or CSS pseudo-element in the new shell renderer.

The flag can be hidden with `flagVisible={false}`. This reveals a completed uninterrupted side panel. The shell does not depend on flag coverage.

## Door and hinge construction

`doors.png` contains nine 272 × 308 cells. Frames 0 through 8 correspond to progress 0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, and 1.

Each frame has its own deliberately authored silhouette, rim pixels, blue shading, and small highlight clusters. The source shapes are rasterized offline to binary-alpha pixels. The browser chooses a complete cell with `Math.round(clamp(progress, 0, 1) * 8)`.

There is no CSS transform-origin or runtime rotation matrix for the door. Its shared physical attachment axis is:

- Mailbox-local: (6, 72) → (40, 76).
- Original world artwork coordinates: (808, 569) → (876, 577).

Every door silhouette meets that axis. A narrow blue attachment edge is part of each door frame itself and meets the shell's lower sill. There is no independent hinge strip painted afterward. The visible connection is represented by the sill and attached door edge, rather than a separate ornamental hinge object.

The closed door covers the aperture. Opening proceeds outward to the left, with the authored contours passing through a thin edge-on pose before reaching the fully open lower-left face.

Door artwork retains its own deliberately authored outline because its moving outer edge must remain visible. At the attachment edge, the colors join the sill instead of drawing a contrasting line over the connection.

The motion hook uses eight time steps across the existing 560 ms door duration and 480 ms flag duration. It reverses from the current progress. Reduced motion selects the endpoint immediately. As with any requestAnimationFrame animation, a stalled/backgrounded browser can skip visual presentation of elapsed frames.

## Flag

`flags.png` uses the original source red flag, pole, and mounting screw. The rotation from down to up is baked offline with nearest-pixel sampling into nine complete frames. The mounting pivot remains source (916, 518), or mailbox-local (60, 46.5).

The flag is painted last. Its original design remains independent of the finished body beneath it.

## Coordinates, scaling, and clipping

| Property | Current value |
| --- | --- |
| World artwork plane | 1786 × 880, unchanged |
| Mailbox placement in that plane | x=796, y=425, unchanged |
| Main mailbox display box at native world scale | 224 × 308, unchanged |
| Mailbox SVG viewBox | 0 0 112 154, unchanged |
| Sprite cell | 272 × 308 source pixels |
| Sprite cell local placement | x=-24, y=0 |
| Source pixels to mailbox-local units | 0.5 |
| Shared source cell origin | world x=748, y=425 |
| Atlas dimensions | 2448 × 308, nine horizontal cells |

The extra left padding gives the opening door room outside the main 112-unit box. Shell, door, and flag use the same cell size and registration; the door is not scaled independently.

SVG is still used as the container and for letter clipping. Artwork is displayed using SVG `image` nodes. Each atlas frame is selected by a nested SVG viewport, not by deforming image content. Image rendering is pixelated; source alpha is either 0 or 255.

The existing responsive world cover transform remains in place. It can produce fractional screen coordinates at some viewport sizes. Native sprite coordinates and all three parts remain registered together; changing global responsive scaling was outside this mailbox-only task.

The letter still uses the existing stepped aperture/passage geometry. Its stored raster is extracted once to `letter.png` and displayed at local (13.5, 45), size 23.5 × 20.5. Those half-unit coordinates map to whole pixels at the native two-pixels-per-local-unit scale.

## Mailbox layer order

Main world mailbox, from top to bottom:

```text
Flag PNG frame
Door PNG frame, including attachment edge
Stored letter PNG, clipped to the aperture/passage when present
Single complete shell PNG, including rim/cavity/sill/post
Existing world behind the mailbox
```

The main mailbox no longer draws a duplicate shell in front of the stored letter.

During globe delivery, `MailboxForeground` is still used after the travelling envelope. It repeats the same registered shell with an aperture exclusion, plus the same door and flag frames. This is the existing occlusion pass needed to hide an external moving envelope behind the mailbox volume. It uses the same complete assets and coordinates; it does not introduce donor artwork or adjacent shell pieces.

## Verification performed

- Browser inspection with the flag hidden and the door closed; also inspected the bare finished shell and fully open door.
- Browser inspection of door 0%, 25%, 50%, 75%, and 100% with the flag raised and lowered.
- Additional daytime lighting inspection of all five lowered-flag poses.
- Browser inspection in the actual `/indi` world, including the stored envelope.
- Browser inspection of the production delivery component at departure, arrival, partial insertion, full insertion, and closure poses. The isolated fixture made no mail API calls.
- Automated checks that every door frame has binary alpha, one connected silhouette, and opaque coverage along the common attachment axis.
- Automated checks for opaque blue shell coverage through the former patch region with the flag absent.
- Automated checks that all door states use one shell and the same raster door system without matrix deformation.
- Letter clipping, delivery containment, and closure regression checks.
- Full test suite: **83 passed, 0 failed**.
- TypeScript `tsc --noEmit`: passed.
- Oxlint on the changed mailbox, geometry, motion, test, and authoring/preview files: passed.
- Production `vinext build`: passed.
- All 13 protected world files: unchanged by SHA-256 comparison.

The test that previously expected the removed main foreground shell was updated to assert that the letter is painted before the raster door. Obsolete affine-door geometry tests were replaced with checks of the finished sprite silhouettes and attachment.

Visual review covered the stated browser poses and the current live scene; it is not a claim of exhaustive testing across every browser/device pixel ratio.

## Review artifacts and commands

- Pose sheet: `.local/mailbox-rebuild/review.png`.
- World baseline hashes: `.local/mailbox-rebuild/world-baseline-hashes.json`.
- Verified hashes: `.local/mailbox-rebuild/world-verification.json`.
- Original mailbox source backups: `.local/mailbox-rebuild/before/`.

Rebuild the PNGs from the saved artwork master:

```sh
node --import ./scripts/register-tests.mjs scripts/author-mailbox-sprites.mjs
```

Open the isolated visual fixture:

```sh
node --import ./scripts/register-tests.mjs scripts/preview-mailbox-sprites.mjs
```

Then visit `http://127.0.0.1:3188/?set=hidden`, `?set=up`, or `?set=down`. These are local review pages, not public deployments.

