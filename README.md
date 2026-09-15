# Our Mailbox

A little world for Indi and Auggie. Open `/indi` or `/auggie` and pass one letter back and forth. The existing artwork, stationery, routes, user names, read state, reply sequence and delivery animations are preserved.

**Storage: browser → existing `mailbox` Cloudflare Worker (Vinext) → Cloudflare D1.** All letter reads and writes use the server-only `MAILBOX_DB` binding. There is no external database client or HTTP database bridge.

**Access is intentionally public, as requested.** Anyone who can reach the site can use either mailbox. The mailbox URL chooses Indi or Auggie; it is not proof of identity. No session or passcode is required. Server-side mailbox and deletion checks do not provide privacy between people who can select either URL. The existing unused passcode/session helpers remain available, with their tests, but are not an access gate.

## Local development

Use Node.js 24 and pnpm 11.19.0. Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

Open [Indi](http://localhost:3000/indi) or [Auggie](http://localhost:3000/auggie). Setup writes local origin settings to ignored `.env.local` and `.dev.vars` files and applies D1 migrations. It does not seed mail, reset existing mail, or require a cloud account. Wrangler and the Vite plugin persist actual local D1 at `.wrangler/state/v3/d1`; `preview_database_id: mailbox-local` keeps that store stable when the production database ID changes.

Apply new local migrations with `pnpm db:migrate:local`. `pnpm dev` builds and opens a local production-runtime preview; restart it after editing source. `pnpm dev:vinext` provides hot reload, but startup is unusually slow in this Windows workspace. Both use the same local D1 store. The old native Next.js/database-bridge fallback has been retired. Next.js remains installed for route types and API compatibility.

For a compiled preview:

```sh
pnpm build:cloudflare
pnpm preview:cloudflare
```

Stop the development server before reusing port 3000. `node scripts/verify-worker.mjs --serve` offers a compiled preview on port 3100 using the same local D1. No separate database process is needed.

## How the exchange works

- An empty world lets either person write first.
- Unread mail has a closed door and raised flag, with no envelope visible. Read mail has an open door and raised flag, with half an envelope inside. After replying, the sender's mailbox is closed with its flag down and no envelope; clicking it shows “No mail right now.”
- Clicking the mailbox opens its flap and draws the actual saved sheet out of the envelope. Closing reverses the same geometry: the sheet aligns, slides behind the front, then the flap closes and settles. Writing a reply first puts the received sheet away.
- Reading sets `read_at` but leaves the letter available to reopen and answer.
- Sending saves the complete document before sealing and delivery begin. One continuous envelope travels through a quiet pixel-star backdrop around the globe. Auggie stays on its north side and Indi on its south side; the return route reverses their roles. The sender faces the orbital route, opens to release the envelope, then closes with its flag down. The recipient starts open with its flag down, receives the envelope through its aligned opening, closes its door, then raises its flag.
- Arrival waits for the database to confirm the write. “Delivered” appears after the arrival sequence finishes.
- The latest sender waits for a reply. There is no inbox, archive screen, or chat UI.

The personal preview contains only retained user mail. Known development messages were removed; the app has no mock inbox, seeded letters, fallback messages or fake return shortcuts. Historical personal letters remain in D1, while the mailbox shows only the current exchange. Automated and browser checks use a separate QA database and port. Drafts stay in memory while the page remains open; they are deliberately not saved to shared browser storage. Leaving with an unsent draft prompts the browser.

The compact toolbar sits to the right of the paper on desktop and below it on phones. Greeting, body and signature are editable text fields, each with its own font, size and ink color. Choose from Pixelify, Caveat, Special Elite and Lora. Sending requires a typed or drawn signature and an actual stamp placed on the paper; the server enforces postage too. Drawing remains available anywhere on the paper.

Add any of ten original perforated postage stamps or ten original pixel stickers, or upload PNG, JPEG and WebP images as stickers. Each new object appears in the center and can be dragged independently, resized proportionally, rotated, or dropped into the animated trash target directly beneath the selected-object controls, outside the paper. Selected objects have a subtle outline and a separate adjustment panel; these controls never appear in preview or sent letters. Uploaded stickers have a white border around their visible silhouette. Arrow keys move selected objects, Shift moves farther, and Delete removes them. Undo/redo supports text, styles, additions, moves, removals, drawing and erasing, with one history step per pointer gesture. Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z work inside the editor.

The marker retains seven ink colors, three sizes and its geometric eraser. Closing and reopening preserves the full draft during the active page session. Sent artwork is saved with its letter in D1. Preview shows the recipient's exact rendering; long bodies continue onto additional sheets, with the typed signature on the final sheet. Received letters offer **Download PDF**, using the same renderer and local fonts to preserve paper, fold, text, objects and ink. PDF pages contain a high-resolution image of the physical sheet; they are keepsakes rather than editable text documents. Regenerate stamp artwork with `pnpm sprites:stamps`.

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

## D1 schema and behavior

`migrations/0001_mailbox.sql` creates:

- `letters`: UUID text ID, `sender_id`, `recipient_id`, optional subject, body, UTC creation/delivery/read timestamps, reply UUID, unique sender/client request ID, JSON artwork, and separate sender/recipient soft deletion flags.
- Inbox and sent indexes by owner and newest creation date.
- `mailbox_world`: the existing exchange's current letter pointer and original establishment date.
- Two insert triggers that validate the current turn and advance the pointer atomically. They replace the previous row-lock behavior, including concurrent first sends and replies.

UUIDs and artwork versions 1–3 are retained. D1 prepared statements bind all request values. The fixed opposite mailbox is the recipient; the strict API schema rejects submitted sender/recipient overrides. Retry IDs prevent duplicate sends and reject changed content. Reads only mark the recipient's copy; opening sent mail does not mark it read. Deleting one copy hides only that mailbox's copy. Deleting the current incoming letter permits the next reply without resurrecting its content, while the latest sender still waits for a response.

Bodies allow 1–20,000 characters. The HTTP body is capped at 2,000,000 bytes and serialized artwork at 1,900,000 bytes to leave room below [D1's 2 MB row limit](https://developers.cloudflare.com/d1/platform/limits/). Large uploaded images may need to be reduced.

### API routes

Every API validates the owner against `indi` and `auggie`. All responses are private/no-store. Mutations require an exact matching `Origin`; payloads are streamed with size limits and strictly validated. Text renders as React text, never raw HTML. D1 is never exposed to client JavaScript.

| Method and route                             | Behavior                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| GET `/api/:owner/letters`                    | Current exchange snapshot used by the existing UI                      |
| POST `/api/:owner/letters`                   | Send signed/stamped artwork; `reply_to` preserves the exchange         |
| GET `/api/:owner/letters?box=inbox&offset=0` | Up to 20 incoming letters, newest first                                |
| GET `/api/:owner/letters?box=sent&offset=0`  | Up to 20 sent letters, newest first                                    |
| POST `/api/:owner/letters/:id`               | Open a visible sender or recipient copy; marks read only for recipient |
| POST `/api/:owner/letters/read`              | Existing recipient-only read action with `{id}`                        |
| DELETE `/api/:owner/letters/:id`             | Soft-delete only the selected mailbox's copy; repeating is harmless    |

The existing site has no Sent screen, inbox list, archive, or chat UI. Inbox/sent listing and per-copy deletion are provided through the API without redesigning that experience. Reply remains part of the existing stationery flow.

## Runtime configuration and diagnostics

| Setting                    | Value                         |
| -------------------------- | ----------------------------- |
| Worker                     | `mailbox` (existing project)  |
| D1 binding                 | `MAILBOX_DB`                  |
| D1 database name           | `mailbox-db`                  |
| Production `APP_ORIGIN`    | `https://auggieisromantic.uk` |
| Production `APP_ADDITIONAL_ORIGINS` | `https://mailbox.aselke2002.workers.dev` |
| Production `LOCAL_PREVIEW` | `false`                       |

The database ID placeholder in `wrangler.jsonc` must be replaced before deployment. No database URL, service credential, session secret or passcode hash is required. `cloudflare-env.d.ts` types the binding as `D1Database`.

Observability stays enabled. In Worker logs, `mailbox_database_failed` reports a safe code and operation: `d1_binding_missing` means the binding is absent, `d1_migrations_missing` means the schema is absent, and `d1_unavailable` means the D1 operation failed. Raw SQL, exceptions, mail bodies and credentials are not logged or returned. The UI retains its retry button, polling recovery and outage backoff.

## Production setup and deployment

See [the numbered Cloudflare checklist](docs/d1-deployment.md), including how to restore the prepared private 30-letter backup. Cloudflare CLI was not authenticated during this migration, so no remote database was created and production was not deployed.

For an empty production mailbox, after replacing the database ID:

```sh
pnpm db:migrate:production
pnpm build:cloudflare
pnpm deploy:cloudflare
```

The build produces `dist/server/wrangler.json`, `dist/server/index.js` and `dist/client/`. Deploy the generated configuration. `keep_vars: true` preserves dashboard variables; secrets also survive deployment. Remove retired database secrets from the existing Worker's settings after migration.

Workers Builds settings remain: repository `CrappyTaco/mailbox`, branch `main`, root `/`, build `pnpm run build`, deploy `pnpm exec wrangler deploy --config dist/server/wrangler.json --keep-vars`, `NODE_VERSION=24.19.0`, `PNPM_VERSION=11.19.0`. Apply production migrations before deploying schema-dependent code. Keep `pnpm-workspace.yaml` and its existing build-script permissions.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build:cloudflare
pnpm verify:build
pnpm verify:worker-config
pnpm verify:worker
pnpm test:e2e
pnpm test:send-browser
```

The unit/integration suite runs 98 tests, including actual Miniflare D1 persistence, artwork versions 1–3, concurrency, idempotency, inbox/sent ordering, per-copy deletion and atomic backup imports. Existing art, animation, validation, session-helper and public-access checks remain. `pnpm test:local` runs the same suite with the bundled TypeScript loader for restricted Windows environments.

`pnpm test:e2e` starts a disposable compiled Worker and actual D1 on port 3101, exercises the entire exchange and delete APIs, then shuts down. It never touches personal local or production data. `verify:worker-config` checks the compiled Worker with missing binding/schema and production-style D1 bindings. `verify:worker` renders both pages and checks font and mailbox endpoints using disposable D1.

`pnpm test:send-browser` clicks through both directions of delivery in Playwright (Edge on Windows, Playwright Chromium elsewhere). It tests both the custom domain and workers.dev address independently of the configured origins, routing every request into the compiled Worker with disposable D1. It checks the POST payload/status, database pointer, sender/destination state, sent listing, and reload persistence. Build first; no requests or test letters reach production.

The browser's origin must exactly match `APP_ORIGIN` or an explicit comma-separated entry in optional `APP_ADDITIONAL_ORIGINS`. Production entries require HTTPS and cannot contain paths or wildcards. Local preview permits only localhost/127.0.0.1 origins. GET verification alone cannot detect a mismatch: writes will return 403 before reaching D1. See [the send failure investigation](docs/send-bug-investigation.md).

## Backups and local maintenance

The migration retained the original local database directory and created `.local/letters-export.json` before importing all 30 letters into local D1. A field-by-field check confirmed IDs, body, dates, replies, retry IDs and artwork. `.local/mailbox-d1.sql` is a complete private D1 export; its restoration into a fresh isolated D1 database was also verified. These files are ignored by Git.

Create a fresh JSON backup with `pnpm export:local`; it writes `.local/d1-letters-export.json`. Import a JSON backup into an **empty local D1** with `pnpm import:local .local/d1-letters-export.json`. Imports run atomically, preserve the world pointer, and refuse nonempty destinations. The importer only uses local D1.

Create a SQL backup with:

```sh
pnpm exec wrangler d1 export MAILBOX_DB --local --config wrangler.jsonc --output .local/mailbox-d1.sql
```

The SQL export includes schema, triggers and migration history; restore it only into an empty database. Do not commit backups or upload them to public repositories. Local mail is not transferred by a Git push or deployment.

`pnpm aging 0`, `pnpm aging 7`, `pnpm aging 14` and `pnpm aging 30` change only local D1 timestamps for visual review; stop the preview first. Contents remain intact.

## Source and assets

- `app/`: mailbox pages and server API handlers.
- `components/`, `hooks/`, `public/`: existing visual world, letter editor, interactions, polling, fonts and sprites.
- `lib/server/`: D1 access, runtime checks and bounded endpoints.
- `migrations/`: D1 schema; add new migrations for future upgrades rather than rewriting an applied file.
- `scripts/`, `tests/`: local setup, backup/import, verification and isolated fixtures.

Artwork specifications remain in [public/world/ARTWORK.md](public/world/ARTWORK.md), [components/animals/SPRITES.md](components/animals/SPRITES.md), and [docs/mailbox-physics.md](docs/mailbox-physics.md). Local fonts retain their license files. Create a source-only archive with `powershell -File scripts/package-source.ps1`; databases, credentials and build output are excluded.
