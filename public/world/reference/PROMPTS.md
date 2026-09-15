# Reference artwork and clean-plate prompts

The user supplied `day.png` and `night.png`. They are copied unchanged from the two attached references. The website renders crops of these originals for its terrain, title, clouds, celestial bodies and animated mailbox. They are not regenerated approximations.

`day-clean.png` and `night-clean.png` were made with the built-in ImageGen tool. Only small masked portions of these plates are exposed: metal previously covered by a flag and grass previously covered by the example clock. The original sky is reused for sky repairs, preserving its color and grain.

## Exact shared prompt

Use case: precise-object-edit. This is a technical clean-plate asset for an interactive website. Edit the provided reference image at precisely the same composition and 1672 by 941 aspect ratio. Remove ONLY: the top-left "Our Mailbox" title and heart; the bottom-right clock panel and ALL its text; all clouds, sun/moon and stars; and ONLY the red mailbox flag including its pole and round pivot. Keep the blue mailbox CLOSED and keep its exact outline, front door, handle, blue metal shading, wooden post, vegetation, rock, every hill, tree silhouette, grass detail, flower, dirt path and grain absolutely unchanged. Where the flag was, restore continuous blue metal on the side and empty sky above its roof. Where the clock was, extend the existing dark foreground grass naturally. Where the sky objects were, continue the existing sky texture exactly. Do not redesign, resize or shift ANY object or change colors. No added objects. Output the entire original scene with just those specified things erased.

## Day suffix

This is the DAY reference. Preserve exact light blue sky and daytime colors.

## Night suffix

This is the NIGHT reference. Preserve exact dark navy sky and nighttime colors.

## Source outputs

- Day: `exec-ede908be-be8f-4137-a657-13e167eb70c2.png`
- Night: `exec-a4b50441-175d-4f05-8807-313bb26d4842.png`
- Generation folder: `01a0937b-4845-7221-b9c2-0d798804e824`

The two references depict different flag poses. The other lighting/pose combinations use the same source cutouts with a local color adjustment. The door opens by rotating the original front panel; letter storage, retrieval and the globe share its entrance mask.
