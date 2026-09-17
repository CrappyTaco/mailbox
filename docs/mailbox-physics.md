# Mailbox rendering and delivery geometry

## Causes and fixes

1. **Sliced envelope:** mailboxPassagePath() combined an approach rectangle ending at local x=3.09 with an aperture beginning at x=7.88. The 4.79-unit gap erased an internal strip during insertion/extraction. MAILBOX_PASSAGE_FACE now defines one connected transit plane extending the opening leftward. The original complete letter.png is unchanged.
2. **Premature rim occlusion:** author-mailbox-sprites.mjs split the master along MAILBOX_DOOR_FACE, placing both jambs in front. The left jamb is the far edge in this perspective. Partitioning along the transit plane puts it behind the letter while retaining the near arch, right jamb, sill and side wall in front. interior.png and exterior.png remain disjoint, pixel-exact pieces of the original shell; no artwork is repainted.
3. **Bottom orientation and approach:** DeliveryScene used a 180-degree rotation, while deliveryFrame() independently assumed a half-circle and an upside-down envelope. One equatorial reflection now reorients the complete bottom assembly: body, aperture, door, flag/pivot, post and baked shading. Its opening faces left. A cubic path uses the same exit anchors as insertion, clears the globe and joins both horizontal passage axes. The envelope is counter-reflected inside the bottom assembly to stay upright without changing artwork or dimensions. Reversing the route reflects the route as a whole; Seattle remains above and Bangkok below.
4. **World labels:** delivery used displayName() for personal names. It now uses the existing WORLD_CONFIG location labels, Seattle and Bangkok. Internal owner IDs and letter ownership remain unchanged. The labels move slightly left so both names fit comfortably.
5. **Title and heart:** MailboxWorld mounted an absolutely positioned header containing ReferenceWordmark, which cropped both words and the adjacent heart from target.png through TARGET_MASKS.title. The header, screen-reader text, crop component and header-specific CSS are removed. The full-viewport scene needs no spacer or replacement header. The browser title is now “Letters”.
6. **Double door outline:** the seated sprite added an inner bevel beside the shell's curved seam, and its inset upper-right contour exposed a narrow crescent of the dark cavity. The offline sprite authoring contour now fills that crescent and reserves edge bevels for the exposed, moving door. The existing nine frames retain their hinge endpoints, projection, opening angle and reversible 560 ms timeline. No door interaction or animation JavaScript changed for this refinement.

## Rendering contract

Mailbox paints rear shell/cavity → envelope → near shell → hinged door → flag. The source-pixel partition derives from MAILBOX_PASSAGE_FACE; the envelope itself has no passage clip. Only the foreground artwork occludes the complete letter (see [the envelope diagnosis](envelope-rendering-diagnosis.md)). The narrower MAILBOX_DOOR_FACE defines the aperture and hinge; the offline door artwork has a small contour correction without changing hinge attachment.

The seated envelope rests on the shared sill. letterX is expressed in mailbox coordinates during retrieval, departure and insertion. Only when fully clear of the door does the delivery scene transfer it to the flight layer. Position, scale, orientation and asset identity match across both transfers. Closure waits until the letter is contained; the flag rises after closure. Late server acknowledgement holds the letter outside the opening.

BOTTOM_MAILBOX_TRANSFORM applies to the complete assembly. mailboxLetterCenter() applies the corresponding point transform for flight endpoints. Globe surface anchors still bury both post ends, and the earth paints above those ends. Reverse routes use the same geometry and depth order.

## Verification

- `node --import ./scripts/register-tests.mjs --test tests/*.test.ts`
- `node --import ./scripts/register-tests.mjs scripts/verify-mailbox-physics.mjs`
- `node --import ./scripts/register-tests.mjs scripts/verify-envelope-integrity.mjs`
- `node --import ./scripts/register-tests.mjs --test tests/send.browser.e2e.ts`
- `node --import ./scripts/register-tests.mjs scripts/review-mailbox-flow.mjs` (built app on port 3100; letter APIs intercepted by fixtures)
- `node node_modules/oxlint/bin/oxlint`
- `node node_modules/next/dist/bin/next typegen` then `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/vinext/dist/cli.js build`

The pixel verifier covers both routes, day/night and 1280×900, 900×650 and 390×844 viewports. It checks completeness throughout transit across the jamb, not only once the envelope is outside. It measures alpha coverage with a white silhouette of the same image, keeping production clipping, transforms and draw order; an unclipped render supplies a pixel-grid reference. This avoids mistaking dark ink blending into the cavity or filtered blue shell repaint noise for missing artwork. Original-color frames are saved for visual review. Closed-door coverage, near-wall occlusion, upright orientation and labels are also checked.

Source tests verify exact shell reconstruction, far/near rim depth, all door-frame hinge contacts and closed coverage. Geometry tests check continuous handoffs, globe clearance and delayed acknowledgement. Browser tests exercise production send/read/reply persistence using disposable D1 databases. The fixture review covers desktop and phone flows, reduced motion, all delivery phases, and the full-height header-free layout.

For slow-motion review, run `node --import ./scripts/register-tests.mjs scripts/preview-mailbox-sprites.mjs 3190` and open `http://127.0.0.1:3190/?set=journey`. Rendered frames are saved under .local/mailbox-physics/ and live-flow screenshots under .local/mailbox-polish/.
