# World artwork

## Current world: September 12 target reconstruction

The current app uses the latest user-supplied `reference/target.png` at its native 1786 × 880 proportions. See [target reconstruction notes](reference/TARGET-RECONSTRUCTION.md) for source registration, dynamic layer ordering, transparent masks, exposed-background provenance, the exact imagegen prompt, and verification commands. Earlier designs below are historical.

## Current world: original reference layers — September 12, 2026

`reference/day.png` and `reference/night.png` are the user's unaltered 1672 × 941 reference images. `components/world/ReferenceArt.tsx` composes the scene from those original pixels. Each cloud has its own crop; hills, trees, grass, flowers, rock and path retain the source's shapes, texture and placement. The title is an accessible image crop, and the clock remains live HTML.

`components/mailbox/ReferenceMailboxParts.tsx` reuses the original body, post, front panel and flag endpoints. The panel rotates around its bottom hinge. The same parts and physical aperture are used by the main scene and the delivery globe, with letter clipping preserved. A single proportionate stage keeps scene art and hit targets registered; portrait screens crop the landscape and bring the sky landmarks inward.

Only exposed flag/clock holes use small masked regions of ImageGen clean plates. Their exact prompts and source filenames are recorded in [reference/PROMPTS.md](reference/PROMPTS.md). The reference pixels are never palette-quantized or procedurally redrawn. Night blends from the two source palettes and cloud/door/flag motion respects reduced-motion preferences.

Checks: `scripts/review-reference-scene.mjs` exercises real browser rendering and letter retrieval with intercepted, isolated API fixtures; it never writes personal mail. `scripts/verify-delivery-art.mjs` checks the shared physical aperture across both flight directions. Review images are in `.local/reference-review`.

## Superseded native geometry — September 11, 2026

The current mailbox, terrain, planting and clouds are authored code-native pixel geometry in `components/mailbox/MailboxParts.tsx`, `components/world/WorldLandscape.tsx` and `components/world/PixelCloud.tsx`, guided by the two supplied day/night references. No new image generation was used for this revision. Earlier generated mailbox, landscape and cloud PNGs below are retained historical assets and are no longer the main world artwork.

The shared mailbox uses a 112 × 154 coordinate system. Its shell, post, interior, rigid bottom-hinged door and single pivoting flag are separate layers. `lib/mailbox-geometry.ts` defines the entrance aperture; stored mail and delivery use that same mask. The globe places the same artwork at half scale. Eight stepped poses animate the door without changing its outline. Day/night colors come from `lib/world-materials.ts`; no dark overlay is applied to the mailbox or terrain.

Landscape clusters use fixed authored placements. Its 836 × 230 view crops proportionally on narrow displays. The stricter fidelity pass smooths fixed hill anchors before quantizing them to pixels, refines the mailbox silhouette and rim, uses three grass-tuft shapes and clustered vegetation, and draws the tapered path in one-pixel rows. Cloud outlines are lighter and their positions follow the supplied composition. The sun and moon retain the earlier pixel PNGs and their provenance below. Letter/envelope art, stamps, stickers and disabled pet assets are unchanged.

The generated-asset processors below reproduce historical art only. They should not be run to recreate or overwrite the current native geometry. `scripts/verify-delivery-art.mjs` renders the current shared component and checks 92 frames across both routes.
## Shared parts and physical opening — September 9, 2026

The current mailbox supersedes the earlier complete-frame atlas below. A single built-in ImageGen request produced a parts sheet: `exec-ac55cec3-4a5b-4d18-95d6-4c3d63b2b6a3.png`, generation folder `01a087c1-1cb4-7131-bd84-95b1cc94d399`. The exact generation prompt is saved alongside this file as `mailbox-left-atlas-prompt.txt`.

`scripts/prepare-left-mailbox.mjs` removes the neutral matte, retains each connected part, makes all material pixels opaque, reduces the eight-color palette and encloses fill in a continuous one-pixel charcoal contour. It registers a 20-pixel front plane beside an 84-pixel side plane. One shared body/post is combined with two doors and two flags; the main and globe views consume those same finished PNGs. The script also repairs stray cool fragments along the open grassy ridge and preserves distant shrub outlines. Flowers retain their native aspect ratio.

The entrance mask is generated from the actual interior's connected pixels in `lib/mailbox-geometry.ts`. The entry/exit passage allows only the space outside the entrance plane plus this aperture. It clips before the actual rim is repainted, so an envelope cannot escape through sloped body bounds, a door or an alpha hole. Stored mail is restricted to the aperture. No-envelope comparison renders check 92 frames across both directions; contact sheets remain in `.local/delivery-review` for visual inspection. The underlying envelope design is unchanged from the prior polish.

To reproduce this latest artwork from source, run the old landscape processor first if needed, then the shared-parts processor. Running the old atlas processor alone would restore the superseded mailbox.

## Mailbox and landscape polish, September 2026

The four mailbox states, landscape, sun and flower cluster were derived from two original ImageGen outputs, then processed locally into a limited palette with binary transparency and nearest-neighbor scaling. They are generated artwork with mechanical pixel cleanup, not scans of hand-drawn sprites.

Prompt direction: a cohesive indie pixel-game sprite atlas with a cobalt mailbox viewed farther toward the left, narrow curved opening, broad side wall, raised/lowered red flag, hanging open door, wooden post, four matching mail states, warm radiant pixel sun and simple flowers. A second image supplied an uncluttered rolling grass landscape with cool distant shrubs, olive middle ground, dark foreground, stepped contours and no blur. Both used the existing project/reference palette and appearance.

Source outputs:

- Atlas: `exec-8119fd6a-c597-4d67-ba0b-4d847992137a.png`
- Landscape: `exec-9e5744e9-128c-41d6-86be-22a18c4c1241.png`
- Generation folder: `01a08420-8a80-7a92-aa61-88063e5ce492`

`scripts/prepare-polish-assets.mjs` registers the frames, narrows the front plane, reuses the same post, removes the neutral source matte, quantizes colors and closes enclosed matte holes in metal. The landscape is filled continuously beneath its stepped contour. Source copies are kept locally in `.local/art-source/polish`; the portable archive includes the finished PNGs and processing script.

The mailbox sprites are 112 × 134, landscape 640 × 360, sun 48 × 48 and flowers 32 × 34. Opaque material pixels always have alpha 255. The sun uses four warm colors, an enlarged cream center, golden bands and rays. Its gentle stepped brightness animation is disabled with reduced motion.

The canonical beige envelope remains editable native artwork in `components/letter/EnvelopeArt.tsx`. Its flap reaches 41 units into the 88-unit envelope height. Main mailboxes, physical opening/closing and miniature delivery envelopes share it. `MAILBOX_ART` defines the opening and placement anchors; `MailboxForeground` places the real rim and walls over the envelope on both the main scene and delivery globe.

Earlier cloud and moon PNGs remain in the same palette and use binary alpha. Animals remain disabled.
