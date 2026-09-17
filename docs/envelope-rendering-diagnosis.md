# Envelope rendering diagnosis

## Working implementation

Both supplied screenshots match the raster `MailboxEnvelope` in
`components/mailbox/Mailbox.tsx`, using `/world/mailbox/letter.png`.
It is a complete 47 × 41 PNG, extracted from `target.png` by
`scripts/author-mailbox-sprites.mjs`. The body, edges, folds and flap are baked
into that one image; there are no pseudo-elements, canvas draws or separate
flap elements in these scenes.

The mailbox displays it at 23.5 × 20.5 local units; flight uses 11.75 × 10.25
world units (the same artwork at the mailbox's 0.5 globe scale). Actual screen
size also follows the scene viewport scale. The envelope is seated at x = 13.5
so its complete rectangle remains readable in the open cavity. The clipping fix
and this placement are verified together.

Main-scene hierarchy before this change:

```text
MailboxWorld → main.our-world → section.world-surface → div.world-scene
  → div.reference-stage → button.mailbox-hit → svg.mailbox-art
    → g[clip-path] → g.mailbox-letter → g[counter-reflection] → image
```

Flight hierarchy:

```text
MailboxWorld → div.world-scene → DeliveryAnimation → DeliveryScene
  → div.delivery-stage → svg.delivery-world → g.delivery-route
    → g.delivery-flight.delivery-envelope → image
```

The screenshot with an envelope away from the mailbox is complete because its
rectangle is clear of foreground mailbox pixels and inside the old passage
boundary. During flight, it is outside the mailbox component and has no passage
clip at all. The globe's clip applies only to its terrain group, not the letter.

## Problematic implementation and historical cause

The affected renderer is the **same** `MailboxEnvelope`, inside `Mailbox` during
retrieval, departure, waiting and insertion. The pre-change element was the
unnamed `<g clipPath={url(#passage)}>` at `Mailbox.tsx:105`, enclosing
`.mailbox-letter`. `MailboxPassageClip` at lines 13–19 supplied a user-space SVG
clip; `mailboxPassagePath()` in `lib/world-style.ts` supplied its geometry.

Git revision `5b9eb1e^` proves the earlier slicing mechanism: the approach
rectangle ended at x = 3.09 and the aperture began at x = 7.88. Their 4.79-unit
gap removed an internal strip while the complete image crossed the entrance.
Additionally, the old raster partition put the far jamb in front of the letter.
That is category **D** (incorrect intentional clip), plus **C** (foreground
occlusion), not incomplete envelope artwork or different mailbox/flight assets.

Commit `5b9eb1e`, already present when this task started, replaced that disjoint
clip with the connected `MAILBOX_PASSAGE_FACE` and moved the far jamb into the
rear layer. The starting workspace also contained uncommitted size, seating,
trajectory and door-color changes. The current baseline passed all 468 existing
delivery-render checks. We did **not** reproduce the historical sliced-strip bug
on this baseline and should not claim that we did.

The starting version still clips the whole image to a fixed passage **as well
as** covering it with `exterior.png` and `doors.png`. At the old stored x = 29.5,
the smaller envelope extended behind the near wall and looked incomplete even
with the clip removed. The current x = 13.5 placement keeps the full rectangle
readable while preserving the foreground depth cue.
The requested architecture removes this redundant second source of visibility.

## Style and state comparison

| Property                       | Free flight                                   | Mailbox before this change                                                              |
| ------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Component / asset              | `MailboxEnvelope` / `letter.png`              | Same                                                                                    |
| Size in local viewBox          | 11.75 × 10.25                                 | 23.5 × 20.5, then globe scale 0.5                                                        |
| Image construction             | SVG `<image>`, nearest-pixel raster           | Same                                                                                    |
| Clip / mask on letter ancestry | None                                          | User-space passage `clipPath`; no mask                                                  |
| SVG overflow                   | `.delivery-world`: visible                    | `.mailbox-art`: visible                                                                 |
| Outer overflow                 | `.delivery-stage`: hidden at scene edge       | `.world-scene`: hidden at viewport edge                                                 |
| Depth                          | Route child, before globe                     | Interior → letter → exterior → door → flag                                              |
| Letter z-index                 | Auto; SVG paint order                         | Auto; SVG paint order                                                                   |
| Main-scene stacking            | Delivery stage z-index 12                     | Hit target z-index 3; reference stage isolated                                          |
| Translation                    | `translate(frame.x frame.y)`                  | `letterX`, or CSS retrieval translation                                                  |
| Scale / rotation               | Route reflection, counter-reflection; angle 0 | Shared scene scale; bottom letter counter-reflected                                     |
| Filter                         | Pixel-art brightness filter where inherited   | Same; changes color, not geometry                                                       |
| Timeline                       | `deliveryFrame`, travelling 1.2–6.2 s         | Departing 0–1.2 s; waiting for confirmation; insertion 1.6 s, closure 0.6 s, flag 0.5 s |

The main retrieval animation is `mailbox-retrieve` in
`components/world/world-redesign.css`: 560 ms delay, 450 ms travel, six steps,
using `--mailbox-exit-x/y`. Delivery positions come from `lib/delivery.ts`.
Only the `travelling` phase swaps from `Mailbox` to the unwrapped flight image;
the asset, aspect ratio and handoff position remain shared. Both owner routes
use these same components. Closed doors intentionally cover stored mail.

`MailboxParts.Sprite` has an inner SVG with `overflow="hidden"` to select atlas
frames. Those SVGs are **siblings**, not ancestors of the envelope. The sky and
landscape overflow rules are also on siblings. No relevant ancestor uses a CSS
mask, perspective, containment or a rounded clipping boundary. The reference
stage transform/isolation and sprite filters do not create an envelope-shaped
hole. Foreground ordering is SVG document order, not a competing CSS z-index.

## Other envelope implementations

`EnvelopeInteraction` is a separate stationery animation: three SVGs using
`EnvelopeBack`, `EnvelopeFront` and `EnvelopeFlap` from `EnvelopeArt.tsx`, with
160 × 88 vector artwork. The back is a rectangular stepped outline and fill;
the front adds side folds, bottom highlight and border; the flap is another
stepped path. Its paper window clips the **paper**, and `.envelope-in-motion`
clips at the letter-stage edge as the envelope departs. These components are
not used for mailbox transit. Keeping the articulated stationery version is
necessary for its opening flap and sheet extraction; it is outside this fix.

`components/world/PixelArt.tsx` also exports an `Envelope` wrapper around those
same vector parts, but there are no current `<Envelope>` call sites. Legacy
envelope animation selectors in `app/globals.css` do not establish additional
active mailbox renderers. `ReferenceMailboxParts.tsx` only re-exports mailbox
parts. There is no separate TravelEnvelope or cropped mailbox envelope asset.

## Recommended fix, implemented

Remove `MailboxPassageClip` and the letter's clipping wrapper. Keep the full
shared image between `MailboxInterior` and `MailboxShell foreground`, followed
by the door and flag. The existing source-pixel foreground partition already
owns the near rim, wall and sill; it can hide the physically covered portion
without modifying or masking the envelope. This preserves artwork, timing,
size, route reflection and retrieval behavior.

The passage polygon remains the offline shell-partition definition and a
geometry reference for verification; it no longer clips the runtime letter.
No new image, redesigned envelope or animation-specific renderer is introduced.

## Verification

Baseline: 468 browser-rendered frames passed before editing production code.
Diagnostic snapshots and ancestor bounds were captured in the ignored
`.local/envelope-diagnosis/` directory. The historical faulty polygon is
verifiable directly in Git rather than inferred from the two good screenshots.

The new `verify-envelope-integrity.mjs` hides the physical mailbox layers and
checks every interior pixel of the envelope rectangle. All 108 renders pass
across explicit transit positions, paused production CSS retrieval, both
orientations, all nine door poses and three display scales. Its negative control
(`--restore-clip`) reinstates the removed clip and fails at the first stored
frame, with 88 missing pixels in the starting workspace geometry. This proves
the test distinguishes an intact object behind artwork from a clipped object.

The visible-scene verifier also passes all 468 frames after the change in both
the working copy and the isolated commit snapshot. All 102 unit tests, lint,
TypeScript checks and the production build pass on the isolated snapshot
containing only this task's changes. The old unit assertion requiring
`clipPath` was replaced with assertions for a complete, unmasked letter between
the rear and foreground layers. Existing source artwork and animation timings
are unchanged. Debugging outlines and overrides exist only in isolated test
pages, never in the application.

Initial send/reply browser runs intermittently timed out before observing a POST.
A focused retry passed with an explicit Send-button readiness assertion. The
test now waits for that control before starting its response timer, and awaits
the click and response together so a click failure cannot orphan the waiter.
This changes only test synchronization, not application behavior. Every browser
request is intercepted into disposable local Miniflare/D1, including requests
whose test URLs use the two production origin strings.

The final synchronized browser run passed both origin cases, exercising sends,
replies, recipient arrival and persistence after reload against the isolated
commit build. Final TypeScript and lint checks also passed.
