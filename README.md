# Our Mailbox

A little world for Indi and Auggie. Open `/indi` or `/auggie` and pass one letter back and forth. No password is needed.

The app includes original pixel artwork, a local-time sky for each world, an animated mailbox, four aging stages, paper stationery, an opening sequence, and a continuous envelope journey around a lit and shadowed globe. Incoming mail updates every four seconds while the page is visible. All saved letters remain in the database.

The scene now uses the supplied day/night artwork directly: full-resolution reference crops preserve the exact mailbox, distinct clouds, hills, trees, flowers, grass, rock and path. The mailbox's original front panel and flag poses remain animated, with a shared physical entrance mask for retrieval and the delivery globe. Small masked ImageGen repairs fill the areas exposed behind flags and the old example clock. Both city clocks remain live. A proportionate scene preserves desktop composition and crops naturally on phones. Artwork provenance and exact generation prompts are in `public/world/ARTWORK.md` and `public/world/reference/PROMPTS.md`.

## Local development

Use Node.js 24 LTS and pnpm. From this directory:

```sh
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

Open [Indi](http://localhost:3000/indi) or [Auggie](http://localhost:3000/auggie). Both mailboxes open immediately without a code. Existing settings and letters are preserved when setup runs again.

The preview uses **PGlite: the actual PostgreSQL engine compiled to WebAssembly**, running in a separate Node process. It persists to `.local/postgres`; it is not a browser-storage mock. A bearer-protected, loopback-only HTTP bridge exposes the same four PostgreSQL functions used through Supabase in production. Docker and a cloud account are unnecessary for this preview.

`pnpm dev` starts the database bridge at `127.0.0.1:55432` and Vinext at `localhost:3000`. Use **localhost** in the browser so the configured request origin matches. Stop with Ctrl+C. Only one process may open this PGlite data directory at a time.

For the current working preview on port 3100, run these in separate terminals instead (do not start a second copy if these ports are already running):

```sh
pnpm db:local
node scripts/preview-next.mjs
```

Open [Indi](http://localhost:3100/indi) or [Auggie](http://localhost:3100/auggie). This launcher sets the correct origin and preserves literal separators in saved password hashes when Next expands environment values. The same routes, styles, security, database functions, and components work in both development modes. This fallback is used because the installed native workerd executable currently exits before starting; the production Worker build still succeeds.

## How the exchange works

- An empty world lets either person write first.
- Unread mail has a closed door and raised flag, with no envelope visible. Read mail has an open door and raised flag, with half an envelope inside. After replying, the sender's mailbox is closed with its flag down and no envelope; clicking it shows “No mail right now.”
- Clicking the mailbox opens its flap and draws the actual saved sheet out of the envelope. Closing reverses the same geometry: the sheet aligns, slides behind the front, then the flap closes and settles. Writing a reply first puts the received sheet away.
- Reading sets `read_at` but leaves the letter available to reopen and answer.
- Sending saves the complete document before sealing and delivery begin. One continuous envelope travels through a quiet pixel-star backdrop around the globe. Auggie stays on its north side and Indi on its south side; the return route reverses their roles. The sender faces the orbital route, opens to release the envelope, then closes with its flag down. The recipient starts open with its flag down, receives the envelope through its aligned opening, closes its door, then raises its flag.
- Arrival waits for the database to confirm the write. “Delivered” appears after the arrival sequence finishes.
- The latest sender waits for a reply. There is no inbox, archive screen, or chat UI.

The personal preview contains only retained user mail. Known development messages were removed; the app has no mock inbox, seeded letters, fallback messages or fake return shortcuts. Historical personal letters remain in PostgreSQL, while the mailbox shows only the current exchange. Automated and browser checks use a separate QA database and port. Drafts stay in memory while the page remains open; they are deliberately not saved to shared browser storage. Leaving with an unsent draft prompts the browser.

The compact toolbar sits to the right of the paper on desktop and below it on phones. Greeting, body and signature are editable text fields, each with its own font, size and ink color. Choose from Pixelify, Caveat, Special Elite and Lora. Sending requires a typed or drawn signature and an actual stamp placed on the paper; the server enforces postage too. Drawing remains available anywhere on the paper.

Add any of ten original perforated postage stamps or ten original pixel stickers, or upload PNG, JPEG and WebP images as stickers. Each new object appears in the center and can be dragged independently, resized proportionally, rotated, or dropped into the animated trash target directly beneath the selected-object controls, outside the paper. Selected objects have a subtle outline and a separate adjustment panel; these controls never appear in preview or sent letters. Uploaded stickers have a white border around their visible silhouette. Arrow keys move selected objects, Shift moves farther, and Delete removes them. Undo/redo supports text, styles, additions, moves, removals, drawing and erasing, with one history step per pointer gesture. Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z work inside the editor.

The marker retains seven ink colors, three sizes and its geometric eraser. Closing and reopening preserves the full draft during the active page session. Sent artwork is saved with its letter in PostgreSQL. Preview shows the recipient's exact rendering; long bodies continue onto additional sheets, with the typed signature on the final sheet. Received letters offer **Download PDF**, using the same renderer and local fonts to preserve paper, fold, text, objects and ink. PDF pages contain a high-resolution image of the physical sheet; they are keepsakes rather than editable text documents. Regenerate stamp artwork with `pnpm sprites:stamps`.

Long letters paginate as you type. Previous/next controls and Page Up/Page Down turn real sheets in both editing and reading. The greeting appears only on page one, with more writing room on continuation pages; the typed signature appears on the final sheet. Text reflows after insertion, deletion, or font changes. A sheet with artwork is retained even when its text moves away, so decorations are never discarded by repagination. Stamps, stickers and ink use coordinates local to their page, including in preview, saved letters and PDF export. Version 3 stores exact text ranges alongside page indices; older document versions remain readable without rewriting them.

Rotation covers a full circle. Hold either rotation or size button for continuous adjustment after a short delay; release, pointer cancellation, leaving the button, lost focus, or changing selection ends the hold as one undo step. Clicking existing text activates the Text tool and places the caret, while objects and active drawing retain pointer priority. The seven animal stamps are original compact postal portraits based on the supplied character references.
Every fresh editor starts in Text mode with the body focused below its greeting. No body text is inserted automatically. Regenerate the built-in sticker artwork with `node scripts/build-stickers.mjs`.

Uploads are processed on-device, before sending. A letter supports up to 24 decorations, including up to six stickers shared between built-in and uploaded designs. Input images are limited to 8 MB and 25 megapixels; processed PNGs have bounded dimensions and a combined 1.8 MB encoded budget. Sticker data stays inside the private saved letter and does not use a public image host.

Aging timestamps and stages remain in the state model. The latest reference-based artwork deliberately keeps the paint clean, with no scratch, rust, vine or mushroom overlays.

## World time and lighting

Indi uses Bangkok (`Asia/Bangkok`); Auggie uses Seattle (`America/Los_Angeles`). The bottom-right clock always shows both cities in 24-hour time. IANA timezone formatting handles Seattle daylight saving automatically, independently of the viewer's timezone.

The sky, clouds, grass, flowers and mailbox blend through a restrained day/night palette. A pixel sun and moon follow a shared 24-hour cycle: dawn at 06:00, sunset at 18:00 with dusk colors around 18:30, sun highest at noon and moon highest at midnight. The delivery globe uses the sender's local time, opposite sun/moon positions and a stepped boundary between its lit and shadowed halves. This is an artistic civil-time cycle, not a seasonal astronomical sunrise or moon-phase forecast. Thirteen quiet stars fade in at night. The existing world composition and letter paper are preserved.

Time refreshes every ten seconds while visible, with CSS smoothing between samples and an immediate refresh when returning to the page. Reduced-motion preferences disable transitions. Corner text and both equally styled clock rows stay readable through twilight. The larger clock leaves room for every digit. Read mail uses the same envelope proportions as the full envelope, scaled to fit with half clipped behind the mailbox lip.

For local visual checks only, append `?skyTime=2026-09-06T19:00:00Z`: Indi shows 02:00 night while Auggie shows 12:00 daylight at the same instant. Other useful Bangkok fixtures are `2026-09-05T23:30:00Z` (06:30 dawn) and `2026-09-06T11:30:00Z` (18:30 dusk). Remove the query to return to real time. The override is ignored outside `LOCAL_PREVIEW`.

## Animal inhabitants

**Temporarily disabled:** `ENABLE_WORLD_CHARACTERS = false` in `lib/world-time.ts` prevents the entire animal component from mounting, including its director, timers and hit targets. Set it to `true` to restore the behavior below; all character code and assets remain intact.

Toffee, Squashy, Wilfred, Lady, Earl, Nibbler and Noddle occasionally visit both worlds in small groups. Rabbits hop, graze and loaf; the cockatiels fly through, roost on the roof and peck at seeds. Tap a character for one of three short visual reactions. Quiet gaps, reduced-motion support and hidden-tab pausing keep the scene calm. Animals make room for opening, reading, writing and delivery.

Seven original transparent sprite sheets use a shared 40-pixel frame grid and fixed character markings. The [sprite specification](components/animals/SPRITES.md) documents the art system, director and local event/reaction query overrides. Run `pnpm sprites:animals` to regenerate the assets.

## Supabase setup

Create or choose a Supabase project and install the official Supabase CLI. From this source directory:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

These are the official [Supabase migration workflow](https://supabase.com/docs/guides/deployment/database-migrations) commands. This task did not create a cloud project or send local letters to Supabase.

Record the project URL and its server-side service-role key for the Worker secrets. Never use the service-role key in a `NEXT_PUBLIC_` variable.

## Environment variables

| Variable                    | Purpose                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `APP_ORIGIN`                | Exact browser origin, without a trailing slash or path. Production must use HTTPS. |
| `SUPABASE_URL`              | Supabase project HTTPS URL; generated loopback URL in local preview.               |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side database credential.                                        |
| `LOCAL_PREVIEW`             | `true` only for the isolated local database; `false` in production.                |

`.env.example` contains no credentials. Local setup writes `.env.local` for Next.js and local scripts, and `.dev.vars` for Vinext/Workers. If you edit local settings, update both files and restart the server.

Production requires database configuration and HTTPS origins. `LOCAL_PREVIEW=true` additionally requires both the app and database to use loopback hostnames.

Password access has been removed. Both mailbox pages and their letter APIs are open without a code or session cookie. Old passcode hashes and session secrets in existing local configuration are unused and are no longer required.

## Database migration

`supabase/migrations/202609050001_mailbox.sql` creates:

- Permanent letters with UUIDs, recipient/sender checks, body limits, timestamps, reply references, and unique client request IDs.
- A singleton world row that serializes sends using a PostgreSQL row lock.
- Persistent authentication attempt limits.
- Indexes for conversation chronology, latest incoming letters, and unread letters.
- Four narrowly scoped server functions; no arbitrary-query API.
- RLS and revoked access for anonymous/authenticated browser roles.

`supabase/migrations/202609060001_letter_art.sql` adds nullable artwork, includes the latest received letter in snapshots, and saves artwork atomically with each send. Existing letters and older clients remain compatible. Artwork uses a bounded 600 × 760 coordinate space, one stamp, and validated stroke colors, widths and point limits.

`supabase/migrations/202609060002_letter_objects.sql` accepts the version 2 document format: independently styled text fields, multiple individually identified objects, bounded PNG sticker data, and editable ink geometry. Version 1 letters remain readable and exportable. New API requests strictly validate the complete document and its matching body text before saving.

The local preview applies all migration files in order, recording each applied migration. Add new migration files for later schema changes; do not rewrite an applied migration.

A unique request ID makes retries idempotent, including when the server saved a letter but the browser missed the response. Concurrent first sends cannot overwrite each other. The server selects the sender from the validated mailbox URL, never a submitted sender field.

## Privacy and accessibility

Anyone who can reach the site can open either mailbox and use its letter interactions. There is no password prompt. Database credentials remain server-side.

Every mutation checks the exact request Origin. JSON payloads are limited while reading the stream, then strictly validated. Letter bodies render as React text, never raw HTML. API responses are private and not cached. Request errors never return database credentials or database error details.

The paper uses the existing accessible dialog primitive with custom stationery styling, a focus trap, Escape dismissal, and focus return to the mailbox. Buttons and text fields support keyboard use; long letters can be focused and scrolled. Reduced-motion preferences stop ambient animation and simplify opening/delivery. No sound autoplays.

## Production build

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build:next
pnpm build:cloudflare
pnpm verify:build
```

The normal Next.js output is `.next/`. The Worker build produces `dist/server/index.js`, its generated Wrangler configuration, and `dist/client/` assets. The secret scan checks that local private values were not embedded in the build.

The Cloudflare path follows the [current Cloudflare Next.js guidance](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), checked September 5, 2026: Vinext is the recommended default. Vinext is beta; this repository pins the tested release. The compatibility date is pinned to May 15, 2026 to match the installed Worker runtime. Native Next.js remains available.

## Cloudflare Workers preview

Keep the local database running, stop the development web server, and run:

```sh
pnpm build:cloudflare
pnpm preview:cloudflare
```

The preview helper copies ignored local variables beside the generated Wrangler configuration; these files are never part of the source archive.

A repeatable smoke test also runs the compiled module directly in Cloudflare's workerd runtime through Miniflare:

```sh
pnpm verify:worker
```

It tests page rendering, font assets, password-free mailbox endpoints and database access, then shuts down. The database bridge must be running. Port 3100 must be free. To leave this production-runtime preview open:

```sh
node scripts/verify-worker.mjs --serve
```

This alternative is useful in restricted Windows environments where Wrangler's auxiliary bundler cannot inspect parent directories.

## Cloudflare Workers deployment

**No deployment was performed.** When you are ready:

1. Apply the Supabase migration.
2. Choose the Worker name and hostname. In `wrangler.jsonc`, set the name and add nonsecret `vars` for `APP_ORIGIN` (the final HTTPS origin) and `LOCAL_PREVIEW` (`"false"`).
3. Run `pnpm build:cloudflare`.
4. Authenticate with `pnpm exec wrangler login`.
5. Deploy the generated output with `pnpm deploy:cloudflare`.
6. Set the two database secrets below, then verify both mailbox routes.

Until all secrets are configured, private APIs return a friendly unavailable state and reveal no letters. Changing the custom domain also requires updating `APP_ORIGIN` and rebuilding/redeploying the configuration.

## How to set production secrets

Run each command from the project directory and enter the value into the prompt:

```sh
pnpm exec wrangler secret put SUPABASE_URL --config dist/server/wrangler.json
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config dist/server/wrangler.json
```

Wrangler stores these as Worker secrets; `secret put` deploys an updated version. See [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/). Do not copy `.env.local`, `.dev.vars`, or LOCAL-ACCESS.md to a public repository. Generate production credentials independently of local preview credentials.

### Deploy from GitHub with Workers Builds

Connect `CrappyTaco/mailbox` using [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/). This is a server-rendered application with database-backed API routes, so use Workers rather than a static Pages deployment.

| Setting | Value |
| --- | --- |
| Worker name | `mailbox` (matches `wrangler.jsonc` and the connected Cloudflare Worker) |
| Production branch | `main` |
| Root directory | Repository root (`/`) |
| Build command | `pnpm run build` |
| Deploy command | `pnpm exec wrangler deploy --config dist/server/wrangler.json --keep-vars` |
| Generated output | `dist/client/` assets and `dist/server/` Worker; no Pages output-directory field |
| Package manager | pnpm 11.19.0, pinned in `package.json`; install from `pnpm-lock.yaml` with `pnpm install --frozen-lockfile` |
| Build variables | `NODE_VERSION=24.19.0`, `PNPM_VERSION=11.19.0` (clean-install/build verification versions) |

The package requires Node.js `>=22.13.0`. Cloudflare documents version overrides in its [build image settings](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

This repository is one application, not a monorepo. `pnpm-workspace.yaml` explicitly includes only the root package (`.`) and retains the dependency build-script permissions for esbuild, workerd, and sharp. Keep that file: deleting it would also discard those permissions. The explicit package list avoids the `packages field missing or empty` validation used by older pnpm bootstrap versions. `allowBuilds` requires pnpm 10.26 or newer, so use the pinned 11.19.0 release and set `PNPM_VERSION=11.19.0` in Workers Builds rather than relying on its default installer.

After `pnpm run build`, the Cloudflare Vite plugin writes `.wrangler/deploy/config.json`, which redirects plain `npx wrangler deploy` to `dist/server/wrangler.json`. Thus the dashboard's plain deploy command can deploy this architecture after a successful build. The explicit command in the table makes the generated target clear and also preserves dashboard text variables with `--keep-vars`.

Configure runtime variables under the Worker's **Settings > Variables and Secrets**, separately from build variables:

- `APP_ORIGIN`: the final HTTPS origin, without a path or trailing slash.
- `LOCAL_PREVIEW`: the string `false`.
- `SUPABASE_URL`: your production Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: your production service-role credential; use the encrypted Secret type.

The deploy command uses `--keep-vars` to preserve dashboard text variables. Secrets are preserved by Wrangler. The current application does not require `SESSION_SECRET` or passcode hashes. Apply all migrations in `supabase/migrations/` to the production Supabase database before using the letter APIs. Local letters and uploaded stickers stored in the local database are private data and are not transferred through Git.

## Verification and development fixtures

`pnpm test` runs 78 unit and PostgreSQL integration tests, including the three mailbox states, continuous delivery and delayed confirmation, globe lighting, required postage, resizable stamps, original sticker assets, timezone/DST transitions, day/night continuity, twilight text contrast, animal behavior, rotated object bounds, partial erasing, typed/drawn signatures, gesture history, document validation, artwork persistence and retry safety. The database tests use independent temporary stores, including a close/reopen persistence check. In restricted Windows environments where `tsx` cannot read the user profile, `pnpm test:local` runs the same suite with the included Node TypeScript loader.

Run the QA database with `node scripts/local-db.mjs --qa`, then the built QA Worker with `node scripts/verify-worker.mjs --qa --serve`, in separate terminals. This uses `.local/qa-postgres`, database port 55433 and app port 3101. The personal preview uses its original store on ports 55432/3100.

`pnpm test:e2e` exercises actual public HTTP endpoints through the entire two-person exchange on the isolated QA Worker. It compares complete artwork documents in both directions, including styled text, line breaks, transformed stamps, built-in/custom PNG stickers and remaining ink paths. It also checks cookie-free access, CSRF, validation, retry safety and repeated reads. It refuses the personal preview port and non-local destinations. These test records never enter the personal mailbox.

Browser validation was also performed through the complete visual exchange at phone, tablet, and desktop sizes; see [VALIDATION.md](VALIDATION.md).

To inspect aging, stop both preview processes before changing local timestamps:

```sh
pnpm aging 0
pnpm aging 7
pnpm aging 14
pnpm aging 30
```

Run one of those at a time, then restart the preview. Unread incoming mail always looks freshly restored; open it to inspect older aging fixtures. These commands alter only development timestamps and preserve letter contents. A new incoming letter restores the fresh appearance automatically.

For a private backup, stop the database and run `pnpm export:local`. It writes `.local/letters-export.json`. Local storage stays local when you configure Supabase; importing a backup into a hosted database is a separate explicit step.

## Source and assets

- `app/`: two mailbox pages and private API handlers.
- `components/world/`, `components/mailbox/`, `components/letter/`: original SVG art and interactions.
- `components/animals/`, `lib/animals/`, `public/animals/`: sprite rendering, shared event director, character configuration and PNG sheets.
- `hooks/use-mailbox.ts`: client request, polling, and animation orchestration.
- `lib/server/`: environment checks, bounded requests, and HTTP database access.
- `lib/mailbox-state.ts`: pure conversation and aging logic.
- `scripts/`, `tests/`, `supabase/`: reproducible setup, checks, and migration.

The locally served Pixelify Sans files include their license in `public/fonts/LICENSE.txt`. World/mailbox art uses the user-supplied day/night references with SVG cropping and animated parts; animal PNGs are generated from integer pixel models. Original reference images and the two small-use clean plates live in `public/world/reference`. Unused starter primitives remain vendored and are excluded from custom-source linting; the application itself uses the dialog primitive and custom semantic controls.

Create a source-only archive on Windows with `powershell -File scripts/package-source.ps1`. Dependencies, build output, credentials, local databases, and local test records are excluded.

