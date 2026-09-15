# Animal sprite specification

The seven reference sheets informed these original production sprites. Reference images are not cropped, embedded or distributed with the app. Rebuild the checked-in PNGs with `pnpm sprites:animals`. The generator uses integer polygons, a one-pixel silhouette outline, and a small opaque palette; it has no image-library dependency.

## Shared art standard

| Property        | Standard                                                                              |
| --------------- | ------------------------------------------------------------------------------------- |
| Frame and sheet | 40 × 40 pixels; 16 horizontal frames; 640 × 40 RGBA PNG                               |
| Display         | 2× integer scale, 80 × 80 CSS pixels, nearest-neighbor rendering                      |
| Transparency    | Alpha 0 or 255; transparent margin; no anti-aliasing                                  |
| Outline         | One source pixel, muted charcoal `#393440`                                            |
| Light           | Upper left, one broad highlight and one lower shadow cluster                          |
| Shared cream    | `#f7efdf`, shadow `#d8cdbe`                                                           |
| Eyes            | `#292531`; rabbit 2 × 3 pixels with one cream glint; bird 2 × 2; Noddle's narrow brow |
| Rabbit nose     | One `#bc8b88` pixel                                                                   |
| Bird feet       | `#a88e83`, dark one-pixel toes                                                        |
| Ground shadow   | Small stepped rectangles `#526c49`, 30% opacity, no blur                              |
| Grass at feet   | `#8aa368`, `#78935e`                                                                  |
| Animation       | Held frames at a nominal 160 ms; one shared 125 ms director timer                     |

Each rabbit uses the same body/head/ear construction across every pose. Markings are anchored to those parts. Toffee keeps a hooked right ear tip; Squashy has a rounded dark body and an uninterrupted cream bib; Wilfred has taller upright ears and patterned cream body patches; Lady has a grey coat, pale muzzle and lop ears; Earl has a white blaze/body patches and a dark muzzle. Nibbler has a yellow crest/face and orange cheeks. Noddle has a pale face/crest, squint and puffed reactions. All use the same outline and lighting.

Frames: 0 idle, 1 blink, 2–3 eat/peck, 4 crouch/wing-up, 5 stretch/wing-down, 6 airborne/wing-up, 7 landing/wing-down, 8 loaf, 9 sleep, 10 ear/crest-up, 11 looking/side-eye, 12 alert, 13 pancake/puff, 14 ear/crest settle, 15 nose twitch. Pose selection lives in `lib/animals/config.ts`.

## Runtime behavior

`AmbientDirector` is a pure, seeded-testable visit/reaction state machine. It chooses one group after a 20–90 second quiet interval (up to 105 seconds on small screens), skips 22% of opportunities, and holds visits for 23–37 seconds. Flybys last 8.5 seconds. Entrances and exits are staggered by 650 ms. Ordinary phone visits have at most two animals, desktop visits at most three. There are no physics, per-animal timers, visible names, tooltips, audio or dialogs.

`AnimalWorld` renders the shared sheets, fits paths to the measured scene and mailbox, places feet along a shallow ground curve, and assigns layers around the post. Roof birds sit above the readable door and flag. Animal hit targets disable during flight, behind the post, or during mailbox interaction. Opening dismisses the group within 600 ms; auth, stationery and delivery own the scene. Incoming mail briefly perks ears/crests. Hidden tabs stop the director's elapsed clock, including cooldowns. Reduced motion uses static sitting/roosting poses with static click reactions and no roaming.

## Local visual checks

Query overrides are parsed on the server only when `LOCAL_PREVIEW=true`. They do not change letters or mailbox permissions. No visible debug panel ships.

- `?animalEvent=toffee-squashy`
- `?animalEvent=wilfred-lady-earl` (forces the full trio, including on phones)
- `?animalEvent=rabbit-solo`
- `?animalEvent=rabbit-grazing`
- `?animalEvent=birds` (roof roost)
- `?animalEvent=bird-flyby`
- `?animalEvent=bird-seeds`

Append `&animalReaction=0`, `1`, or `2` to choose a click reaction; `&animalMotion=reduce` to preview static motion; `&animalSpeed=4` to accelerate a visit; or `&animalMail=new` to preview a raised flag and closed door without creating mail. The forced event begins after unlock and runs once. Reload to replay. Remove the query for normal randomized visits.

`pnpm test:local` runs the same unit/PostgreSQL suite using the included TypeScript loader when `tsx` cannot read the Windows user profile in a restricted environment.
