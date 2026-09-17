# Mailbox artwork provenance and authoring

This directory contains the finished mailbox assets introduced on 2026-09-12. The original world reference and world rendering were not edited.

## Runtime files

| File       | Dimensions | Purpose                                                              |
| ---------- | ---------- | -------------------------------------------------------------------- |
| shell.png  | 272 × 308  | One finished shell, arched rim, cavity, sill, side, roof and post    |
| doors.png  | 2448 × 308 | Nine deliberately authored door silhouettes, one 272 × 308 cell each |
| flags.png  | 2448 × 308 | Nine baked flag positions, including the original mounting screw     |
| letter.png | 160 × 88   | Complete closed envelope from shared stationery vector artwork       |

`shell-border-master.png` is the current saved image-generation output, used only during offline authoring. `shell-master.png` is retained as its original source. Individual `door-0.png` through `door-8.png` are authoring/review outputs and regression-test inputs. `registration.json` records the shared origin, hinge, and authored silhouettes.

## Complete envelope correction (2026-09-17)

The former 47 × 41 scene crop contained only the visible part of an envelope
already inside the mailbox. Its truncated flap remained visible in free flight.
`scripts/author-envelope-sprite.mjs` now renders the existing `EnvelopeBack`,
`EnvelopeFront` and `EnvelopeFlap` vector components into a complete PNG.
Mailbox and flight preserve its 160:88 aspect ratio. Rebuild only this asset with
`node --import ./scripts/register-tests.mjs scripts/author-envelope-sprite.mjs`.
The full mailbox authoring script also calls this generator.

## Border and door refinement (2026-09-13)

The blue shell now has a restrained roof highlight and a quieter front bevel.
Its original silhouette mask and post pixels are preserved. The authoring
script uses a two-source-pixel navy exterior edge, matching the exposed doors.
The seated door seam is a secondary blue shadow; its top/left bevel is muted,
and isolated glints have been removed. Matching step lengths on the closed
arch balance its left and right shoulders. The hinge axis, door bounds,
moving silhouettes, flag, envelope, frame count, timing and renderer remain
unchanged.

The shell edit used the built-in `image_gen.imagegen` tool with the original
`shell-master.png` as its local reference. The selected output was
`exec-448d4429-f649-4565-94f2-881540abe006.png`, saved locally as
`shell-border-master.png` (1122 × 1402). Its exact prompt is recorded in
[`shell-border-prompt.txt`](shell-border-prompt.txt). The generated master has
an opaque background; the existing registered silhouette mask excludes that
background entirely from the runtime RGBA sprite. Runtime alpha remains binary.

Validation: 22 mailbox/state/letter-motion tests passed. Browser review covered
all nine poses, raised/lowered/hidden flags, stored mail, day/night palettes,
three display scales, opening/closing and mid-motion reversal. Main-scene
checks covered desktop and phone viewports. Pixel comparisons confirmed the
original shell alpha, post, flag, envelope and moving silhouettes, and hashes
confirmed all 191 app/scene files outside this asset directory were unchanged.
Before/after images and verification records are in `.local/mailbox-border/`.

## Original shell source and tool

- Source: `public/world/reference/target.png`.
- Reference crop: source rectangle (744, 416), size 256 × 320, enlarged nearest-neighbor to 1024 × 1280 for the edit.
- Tool: built-in `image_gen.imagegen`, image edit with a referenced local image.
- Original generated output: `C:/Users/crapp/.codex/generated_images/01a097c8-6ed4-7812-bc4e-339dbf08d04a/exec-59c2a2f4-a71c-46b0-bd2c-ee1931fb0c94.png`.
- Saved master: `public/world/mailbox/shell-master.png`, 1122 × 1402 RGBA.
- Offline preparation: `scripts/author-mailbox-sprites.mjs` registers the master to the existing outer silhouette, preserves the original lower post pixels, authors the door frames, and extracts/bakes the original flag. This script does not call image generation again.

The entire blue shell is derived from the new cohesive master. It does not copy an adjacent rectangular blue donor region. The original silhouette is an outer cutout, not an interior patch. The source wooden post is retained from source y ≥ 574. Outer blue-shell border pixels are assigned the common dark outline color so old flag pixels cannot survive at the roof edge.

## Exact image-edit prompt

```text
Use case: precise-object-edit / background-extraction.
Asset type: registered pixel-art mailbox SHELL sprite for an existing game scene.
EDIT TARGET: the attached 1024x1280 crop of the CURRENT mailbox artwork. This is an edit, not a redesign.
Produce the exact same 1024x1280 composition, with the mailbox body and wooden post at EXACTLY the same pixel positions, silhouettes, size, proportions, blue palette, lighting, wood grain, and left-facing three-quarter perspective.
Remove ONLY the entire red flag/pole/pivot, the open door projecting lower-left, and the cream envelope in the opening. Paint the whole exposed blue side as continuous, cohesive blue metal with the existing broad stepped shading flowing uninterrupted under where the flag was. No seam, vertical line, cutout, rectangle, pole ghost, or extra highlight in that area. The roof must flow naturally into the arched front rim as one shell. Preserve the existing thin stepped arched rim and dark interior cavity; finish the floor/lower sill where the door attaches at original coordinates. Do not create a new flat front plate or extra thick outline.
Extract ONLY the blue open shell and its existing wooden post on a genuinely TRANSPARENT background. Remove ALL surrounding mountains, sky, grass, plants, flowers, ground, and the removed door; do not draw a checkerboard or colored background. Keep the original visible jagged lower post silhouette where plants previously overlapped; do not invent a longer post. The shell must remain hollow and empty, dark interior with subtle pixel shading.
At this input resolution each native source pixel is a 4x4 block. Keep that exact coarse pixel scale and stepped contours. Do not smooth edges, introduce photographic textures, change the orientation, recenter, enlarge, crop, add lettering, add hardware, or redesign any visible part. Only one mailbox shell and post, NO door, NO flag, NO envelope. Exact registration to the input is essential.
```

## Reproduce the runtime assets

### Final polish pass (2026-09-13)

The existing authoring script now gives the moving door a narrow shaded lower
edge within its original silhouette, colors its attachment corners on the same
hinge axis, and refines the shell's lower lip and two jamb returns. The rear
outline has a few smaller staircase steps; the overall body/post bounds remain
unchanged. The lower flag pole and existing pivot ring receive a few stronger
contact pixels. The red banner, closed door, post, letter, frame registration,
and runtime motion behavior are unchanged.

These refinements are authored directly into the existing sprite outputs by
`scripts/author-mailbox-sprites.mjs`. The saved shell master is unchanged. No
new generated artwork, donor texture, runtime patch, or extra layer was added.
See `MAILBOX-POLISH.md` in the repository root for exact scope and verification.

From the repository root:

```sh
node --import ./scripts/register-tests.mjs scripts/author-mailbox-sprites.mjs
```

The script uses the checked-in master; generation is not needed to rebuild the runtime PNGs. The final sprite pixels have binary alpha. The door changes by choosing a completed frame, and the flag's nearest-pixel rotation is baked offline.

See `MAILBOX-REBUILD.md` in the repository root for runtime architecture and validation.
