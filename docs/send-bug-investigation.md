# Send Letter production failure — 2026-09-15

## Root cause and evidence

The public site is `https://mailbox.aselke2002.workers.dev`, but the deployed origin guard accepts `https://auggieisromantic.uk`. `wrangler.jsonc` supplied that old value. The guard itself was unchanged by the Supabase-to-D1 migration.

Production probes used `POST /api/indi/letters`, `Content-Type: application/json`, and `{}` (deliberately invalid, so no test letter could be created):

| Origin header | Status | JSON error |
| --- | --- | --- |
| `https://mailbox.aselke2002.workers.dev` | 403 | This request came from a different world. Please refresh. |
| `https://auggieisromantic.uk` | 400 | Please check your letter. Use 1–20,000 characters. |

Changing only Origin reached body validation. This establishes that the first rejection is the origin guard, before any database access. Production UI inspection also reached the received-letter and reply editor controls. A complete Send-button reproduction used the compiled production Worker with isolated D1, avoiding fake production letters: the real browser submitted valid signed/stamped artwork and got the identical 403 before the fix.

Direct remote D1 SELECTs before and after production probes showed:

- 30 letters, zero sender/recipient soft deletions.
- Current pointer `6d2e3c2e-ff02-4854-bf26-8bef5c822f16`, Auggie → Indi.
- Unchanged read timestamp `2026-09-14T23:21:55.885Z`.
- Both `letters_validate_turn` and `letters_advance_turn` triggers present.

No production letters were inserted, deleted, reset, or rewritten during this investigation.

## Exact click-to-storage flow

1. `Stationery` submits its form, prevents navigation, validates signature/postage, and calls `onSend`.
2. `MailboxWorld` calls `box.send()`. `useMailbox.send` validates the draft, retains a retry UUID, sets phase `saving`, and awaits `fetch`.
3. The browser sends `POST /api/{owner}/letters` with `{body, reply_to, client_id, artwork}`. Owner is the route's `indi` or `auggie`; no sender/recipient override is sent. Fetch uses same-origin credentials and no-store caching.
4. `letters/route.ts` calls `endpoint`, which validates owner and calls `protectOrigin` **before** invoking the route handler. The mismatched Origin throws HTTP 403.
5. The client parses that JSON error, restores phase `writing`, and preserves the draft. No sealing/delivery confirmation occurs; the previous snapshot remains, correctly reflecting the unchanged database.
6. With a matching origin, the handler parses the body and awaits `MailboxDatabase.send`. An awaited D1 batch inserts the letter and selects it by sender/client retry ID. The insert triggers validate the turn and atomically update `mailbox_world.latest_id`; recipient is always `otherOwner(owner)`.
7. HTTP 201 returns the saved letter. The hook confirms delivery, waits for sealing and flight callbacks, updates the snapshot, clears the draft, and refreshes. The sender becomes `waiting`; `receivedLetter` is null in that world. The opposite world polls into `new-mail`. The saved letter remains in the sender's sent API listing and the recipient's inbox.

`letters/[id]` handles opening (POST) and per-copy deletion (DELETE), not sending. `letters/read` handles recipient reads. Both share the same origin guard. The compiled HTTP suite exercises these routes and confirms that the static `read` route is not swallowed by `[id]`. No SQL, binding, owner-name, await, cache, or state-model change was needed.

## Fix and verification

- Set `wrangler.jsonc`'s `APP_ORIGIN` to the actual workers.dev origin; align the example environment and deployment docs. Preserve strict origin validation.
- Assert the public origin in compiled-config verification, independently of the config-derived test URL that previously hid this mismatch.
- Add `tests/send.browser.e2e.ts` and `pnpm test:send-browser`: real React clicks, real compiled Worker routes and disposable D1; both send directions, exact POST fields/Origin/status, D1 row count/pointer, sender mailbox emptied, destination new mail, sent listing, retained artwork, and page reloads.
- Run the browser regression before the fix to prove it fails with 403; run it again with the corrected production build.

Final results: 98/98 unit/integration tests passed, including D1 restart persistence; the HTTP end-to-end test passed; the browser test passed in both directions; TypeScript, lint, Cloudflare production build, build scan, compiled-config checks, and Worker checks passed. The existing raster tests needed the already-installed Sharp directory on `NODE_PATH` in this environment. Browser tests foreground the active sender because animation and polling intentionally pause in hidden tabs.

The production deployment remains unchanged until the corrected build is deployed. Run `pnpm build:cloudflare` and `pnpm deploy:cloudflare`. No D1 migration, import, reset, or data repair is required. Commit/push the reviewed source if using Workers Builds so later builds retain the fix.
