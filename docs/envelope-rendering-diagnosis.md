# Envelope rendering diagnosis

## Root cause: incomplete source artwork

The persistent cut-off appearance in both the open mailbox and free flight
came from `public/world/mailbox/letter.png` itself. The authoring script
extracted a 47 × 41 rectangle at (823, 515) from `reference/target.png`, where
the illustrated envelope was already partly inside the mailbox. That rectangle
had opaque pixels, but its off-center flap ended at the crop's right edge.
Displaying every pixel of that rectangle did not restore the missing drawing.

The earlier diagnosis incorrectly described this crop as a complete envelope.
Earlier fixes addressed a real disjoint passage clip and foreground jamb
ordering, then changed seating. They did not solve the source-artwork defect.
The user's free-flight screenshot is particularly useful: that renderer has
no mailbox clipping or foreground occlusion, yet showed the same defect.

## Implemented correction

`scripts/author-envelope-sprite.mjs` renders the existing `EnvelopeBack`,
`EnvelopeFront` and closed `EnvelopeFlap` components from
`components/letter/EnvelopeArt.tsx` into the runtime PNG. It depicts a complete
envelope with a centered flap, both side folds, and all four borders. The main
mailbox authoring script calls this generator instead of cropping the scene.

The shared dimensions live in `lib/envelope-art.ts`. The PNG is 160 × 88;
mailbox geometry preserves that aspect ratio at 23.5 × 12.925 local units.
Flight uses the same PNG at the globe's 0.5 scale (11.75 × 6.4625 units).
Stored x remains 13.5, and the bottom is seated against the shared sill.
The articulated stationery animation continues using the same vector layers.

## Rendering and motion

Both scenes use `MailboxEnvelope`, an SVG image with pixelated rendering.
Mailbox paint order is interior → envelope → foreground shell → door → flag.
The envelope has no passage clip. Actual foreground artwork supplies depth;
the closed door hides stored mail. Sprite-atlas clipping belongs to sibling
shell/door/flag elements and does not clip the letter.

During travel the image is a child of the delivery route, outside `Mailbox`.
It shares artwork, aspect ratio and handoff geometry with departure/insertion.
The bottom assembly is reflected and its envelope counter-reflected upright.
CSS retrieval remains a horizontal six-step translation after the door opens.
Animation timing, letter ownership and send/persistence behavior are unchanged.

## Verification

The artwork regression compares the checked-in sprite with the complete closed
stationery rendering and checks its natural aspect ratio in both scenes. It
also checks the centered flap, left/right folds and all four border colors.
This catches the former cropped drawing that alpha-only tests accepted.

`verify-envelope-integrity.mjs` checks complete pixel coverage with physical
foreground layers hidden, including CSS retrieval, transit, all door poses,
both orientations and three scales. `verify-mailbox-physics.mjs` checks visible
delivery frames, including closed coverage, upright orientation and both routes
in day/night at desktop and mobile sizes. These check rendering correctness;
they are complementary to source-artwork inspection, not a replacement for it.

Validation: 103 unit tests, 108 full-object renders and 468 visible delivery
frames passed, along with lint, TypeScript and the production build. Close-ups
were visually reviewed both seated and outside the opening. The visible-frame
test now compares stored mail against its rendered reference rather than an
analytic rectangle area: at the 900px viewport, pixel rounding gives 98/98
visible reference pixels despite a fractional rectangle area of approximately
122. The source-artwork test separately verifies that those pixels depict the
complete envelope.

Rebuild the sprite with:

```sh
node --import ./scripts/register-tests.mjs scripts/author-envelope-sprite.mjs
```
