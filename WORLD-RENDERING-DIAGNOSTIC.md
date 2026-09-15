# REBUILD ONLY THE MAILBOX RENDERING — PRESERVE THE DESIGN

The diagnostic has made the root problem clear.

Do not perform another small patch-based cleanup of the current mailbox implementation.

The current mailbox is visually strange because it is assembled from too many independently rendered systems:

- cropped PNG mailbox shell
- copied donor texture patch
- SVG closed door
- cropped PNG open door
- stationary SVG hinge strip
- independently rendered flag

This architecture is producing seams and making the mailbox look assembled from separate pieces rather than like one physical pixel-art object.

I want you to REBUILD THE MAILBOX RENDERING ARCHITECTURE while preserving the current visual design.

## IMPORTANT

I like the CURRENT mailbox design shown in the reference.

Preserve:

- exact overall mailbox shape
- blue color palette
- post
- flag design
- proportions
- scale
- position
- perspective
- pixel-art style
- opening direction
- current world composition

This is NOT permission to redesign the mailbox aesthetically.

It is permission to replace the underlying way the mailbox artwork is assembled.

---

# 1. THE MAILBOX BODY MUST BECOME ONE COHERENT ARTWORK

The blue mailbox shell should read as ONE uninterrupted pixel-art object.

Do not construct its visible exterior using rectangular repair patches.

Remove the existing donor texture solution identified in the diagnostic:

`ReferenceMailboxParts.tsx`
`MailboxShell`

The region currently copied from approximately:

x = 926–944
y = 466–527

and translated left should no longer be used as a texture repair.

Do not replace it with another copied rectangle.

Instead, create/derive a clean mailbox shell artwork where the blue side panel is continuous underneath the flag.

There must be no:

- vertical seam
- rectangular texture patch
- sudden brightness change
- crop boundary
- white/light line
- mismatched blue pixels

The roof, side wall, lower edge, and front opening should look as though they were drawn together as one sprite.

---

# 2. REBUILD THE FRONT OPENING / DOOR CONNECTION

The current front opening still looks like a separate flat plate attached to the mailbox.

Fix this.

The front arched frame must visually flow into the mailbox body.

Pay special attention to:

- top rounded roof transition
- left/front outline
- bottom front lip
- interior darkness
- side-panel connection

There should not be a visual impression of:

"one blue rectangle + an arched piece pasted onto it."

It must read as one three-dimensional pixel-art mailbox.

---

# 3. STOP USING TWO DIFFERENT VISUAL SYSTEMS FOR THE DOOR

The diagnostic found that the door currently changes between:

- SVG geometry
- cropped PNG artwork

during the opening sequence.

That is creating inconsistent contours and makes it harder for the hinge to look physically connected.

Replace this with ONE consistent visual system.

For this pixel-art scene I strongly prefer deliberately authored pixel-art door states rather than mathematically distorting one flat door.

For example:

- closed
- slightly open
- quarter open
- halfway open
- mostly open
- fully open

These may be sprite frames or equivalent deliberately authored pixel geometry.

Interpolate/timeline between those frames as needed.

Do NOT simply stretch, shear, or squash a flat front door if doing so damages the pixel-art perspective.

---

# 4. MAKE THE HINGE PART OF THE PHYSICAL DESIGN

The diagnostic found that the current hinge is a stationary SVG strip painted over the door/body connection.

That is why it can look like a floating decorative line.

Remove that approach if necessary.

The hinge should be visually integrated into the mailbox body and door.

The hinge axis can remain mathematically stable, but the visible artwork must correspond to that same axis.

The following must all agree:

- body attachment point
- door attachment point
- hinge artwork
- door rotation axis
- open-door silhouette

The viewer should immediately understand:

"this door is attached to this mailbox here."

The hinge should not look like something placed over the artwork to cover a gap.

---

# 5. PIXEL ART — DO NOT LET THE BROWSER DESIGN THE SHAPES

Avoid relying on continuous SVG deformation to create important perspective changes if it produces unnatural pixel contours.

This is pixel art.

Prefer intentionally authored silhouettes at important animation states.

The mailbox must have deliberate pixel clusters and stepped curves.

No:

- smooth vector-looking distortions
- one-pixel accidental lines
- interpolation seams
- fractional slivers
- mismatched outlines
- blurry edges

Use integer-aligned artwork wherever practical.

---

# 6. KEEP THE FLAG SEPARATE

The flag needs to animate, so it can remain a separate moving component.

But the mailbox shell underneath it must already contain correct continuous blue artwork.

The flag should sit ON TOP of a finished mailbox.

Removing the flag should reveal a perfectly normal continuous mailbox side.

This is extremely important.

The underlying body must not depend on the flag being present to hide repair work.

---

# 7. DO NOT TOUCH THE WORLD

Do not modify:

- sky
- clouds
- sun
- moon
- mountains
- hills
- trees
- grass
- flowers
- rocks
- path
- camera
- framing
- scene scale

The rendering diagnostic showed that these are not the source of the mailbox problem.

This task is MAILBOX ONLY.

---

# 8. VISUAL TEST

Before finishing, temporarily render the mailbox with:

FLAG HIDDEN
DOOR CLOSED

Inspect it.

The mailbox by itself should look like a completely finished pixel-art object.

Then test:

FLAG UP
FLAG DOWN
DOOR CLOSED
DOOR 25% OPEN
DOOR 50% OPEN
DOOR 75% OPEN
DOOR FULLY OPEN

At every state:

- body remains visually continuous
- no vertical seam
- door remains physically attached
- hinge remains believable
- front opening remains structurally coherent
- no black lines appear
- no white lines appear
- no rectangular patches appear

---

# CORE PRINCIPLE

Do not solve this by adding more patches to the current patchwork.

Simplify the rendering.

The final architecture should conceptually be:

MAILBOX SHELL
(one coherent piece of pixel artwork)

+

DOOR
(one coherent animation system physically attached to shell)

+

FLAG
(one separate animated component)

Not:

CROP
+ PATCH
+ SVG
+ PNG
+ HINGE OVERLAY
+ FLAG

Preserve the existing visual design but rebuild the implementation underneath it so the mailbox finally looks like one coherent object.