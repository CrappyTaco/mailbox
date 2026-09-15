# Target reconstruction — September 12, 2026

The sole visual reference is `target.png`, the unaltered 1786 × 880 image supplied in this task. It supersedes the earlier day/night artwork. Source pixels provide the terrain, vegetation, path, rock, clouds, moon, title, mailbox, open door, flag and stored envelope.

`scripts/build-target-masks.mjs` reads the source pixels and writes SVG masks into `lib/target-masks.ts`. Clouds retain only their connected silhouette and have binary transparency; their bounding rectangles never paint. The generated masks are checked in.

The world uses one 1786 × 880 registration plane. Its mailbox SVG starts at (796, 425), at two image pixels per local coordinate, with no independent stretching. The open body, door and flag match the supplied placement. The source's closed side is unobservable; its reverse face uses code-authored pixel geometry fitted to the same opening. Both faces share a rigid bottom hinge through animation. The opening/closing, mail states, letter editor, delivery globe and clocks remain driven by their existing state machines. Daylight derives from the new reference's shapes through lighting, because no daytime reference was supplied in this task.

Actual render order is sky gradient → stars → masked clouds → sun/moon → masked terrain → mailbox → UI. The time preview remains local-only; production clocks use the current instant and existing IANA time zones.

## Small exposed background regions

`target-clean.png` was made with the built-in imagegen tool. Its native size is 1786 × 881; it renders at native aspect ratio, clipped by the 880-pixel world. Only tiny regions uncovered by the door/body or clock use this plate. Original source pixels cover the remainder of the landscape. The clean plate also supplies the mountain horizon behind the removed objects when generating the mask.

Original generated output: `C:/Users/crapp/.codex/generated_images/01a0979f-8dbe-76e0-876e-3561021620a2/exec-7347cad8-d409-47dc-8618-fff9d72f0c60.png`.

Exact imagegen prompt:

> Edit target: the attached 1786x880 pixel-art night scene. Make a registered clean background plate, same dimensions and EXACT same composition, colors, horizon positions, landscape, pixel density and all detail outside removed objects. Remove ONLY the mailbox including blue body, open door, letter, red flag and wooden post (center x755..981 y431..718); fill its place by continuing the EXISTING distant blue hills, dark trees and green meadow, preserving all existing plants, daisies and gray rock around its base. Also remove the bottom-right clock panel (x1519..1762 y754..847), continuing the existing meadow behind it. Remove the title and heart at upper left, and every star, cloud and moon, replacing with uninterrupted existing subtle blue night sky. Do not move or redraw any foreground flowers, grass, path, rock, hills, trees. Do not change framing or invent anything. This is a tiny-hole inpainting clean plate for a website whose foreground objects will be added dynamically. Exact registration is essential. No rectangles, no new objects, no text.

## Verification

- `node --import ./scripts/register-tests.mjs --test tests/*.test.ts`: application suite.
- `node scripts/review-target-scene.mjs`: original-size reference comparison, day/night/dawn/dusk and portrait; equal X/Y scale and no horizontal overflow.
- `node --import ./scripts/register-tests.mjs scripts/verify-sky-art.mjs`: six cloud silhouettes at two lighting levels, binary alpha and transparent corners, ten forced sun/moon overlap comparisons with a deliberately wrong stacking order as positive control.
- `node --import ./scripts/register-tests.mjs scripts/verify-delivery-art.mjs`: 216 image comparisons across departure, insertion, closure and flag movement, both routes and lighting conditions.
- `node scripts/review-mailbox-flow.mjs`: real browser retrieval, replying, sealing, globe travel, insertion, closure, flag and return to world for both owners, with all API writes intercepted.
- `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/oxlint/bin/oxlint`, and `node node_modules/vinext/dist/cli.js build`.

Reference comparison screenshots and measured bounds are in `.local/reference-reconstruction/`. All UI workflow checks use fixture mail; no personal letters are changed.

