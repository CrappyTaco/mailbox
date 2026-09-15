# Mailbox rendering and delivery geometry

## Diagnosed causes

- **Floating stored letter:** `Mailbox` placed the raster envelope at a fixed `y=45`, independently of the newer shell's sloping sill. Its bottom ended above the floor. The position is now derived from the hinge/floor and snapped to the envelope pixel grid.
- **Door gaps and doubled borders:** the closed panel added an ink contour inside the shell's existing rim. During opening, independently rounding projected vertices created crossed edges and missing columns near the hinge. The authoring script now projects a rigid quarter turn about the shared sill, extrudes the sheet boundary before rasterization, and lets the shell supply the closed border.
- **World letter clipping and inconsistent appearance:** delivery used the separate 160:88 vector envelope at a local width of 48 units; the close-up used a 47:41 raster at 23.5 units. The aperture is about 30 units wide. An oversized envelope, stale entrance coordinates, and a world-space clipping path made partial visibility look like a chopped asset. Both mailbox scenes and flight now use the original complete raster and its proportions.
- **Rim leaks at fractional sizes:** an analytic SVG clip and a separately resampled PNG rim can disagree at a device-pixel boundary. The shell is now partitioned into disjoint cavity and exterior PNGs on the original source grid. The actual exterior pixels cover the envelope. A regression test verifies that the two layers reconstruct the original shell exactly, without overlap, missing pixels, or changed colors.
- **Floating globe mailboxes:** the original world placement assumed the entire 154-unit canvas was occupied. The visible post ends earlier and includes scalloped cutouts. Placement now anchors the continuous post shaft to the globe surface; the terrain paints over the buried end.
- **Duplicated scene geometry:** delivery previously rendered each mailbox once below and once above an independently transformed letter, and reflected the sending mailbox horizontally. It now uses one shared mailbox assembly per location, with local insertion/extraction coordinates and an unreflected sending orientation.

## Rendering contract

`Mailbox` paints cavity → envelope → exterior shell → hinged door → flag. The passage clip permits only the true aperture and the space beyond the front jamb. The exterior layer provides pixel-accurate wall occlusion. Atlas viewports retain their required frame clipping; the envelope itself is an untrimmed image.

During extraction/insertion, `letterX` is expressed in mailbox units. Once the entire envelope clears the open door, `DeliveryScene` transfers it to the world flight layer. Its world position, dimensions and rotation match at both handoff boundaries. The flight layer has no mailbox clip. The receiving mailbox performs the reverse transfer before insertion.

The globe, post anchors, route, and letters share the delivery SVG coordinate system and scale together. Close-up retrieval uses the same stored and exit positions. The landscape, palette, flag artwork, envelope raster and original shell colors are preserved.

## Verification

- `node --import ./scripts/register-tests.mjs --test tests/*.test.ts`
- `node --import ./scripts/register-tests.mjs scripts/verify-mailbox-physics.mjs`
- `node --import ./scripts/register-tests.mjs scripts/review-mailbox-flow.mjs` (local app on port 3100; all letter APIs intercepted by fixtures)
- `node node_modules/oxlint/bin/oxlint`
- `node node_modules/next/dist/bin/next typegen` then `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/vinext/dist/cli.js build`

The pixel verifier samples 468 production-component frames across both owners, day/night lighting, and 1280×900, 900×650 and 390×844 viewports. It checks aperture occlusion, complete exterior envelopes, and closed-door coverage. Raster comparisons allow a half-device-pixel boundary and small RGB resampling noise; source-pixel layer reconstruction and door coverage tests remain exact.

For manual slow-motion review, run `node --import ./scripts/register-tests.mjs scripts/preview-mailbox-sprites.mjs 3190` and open `http://127.0.0.1:3190/?set=journey`. Door poses and the journey contact sheet are saved under `.local/mailbox-physics/`.
