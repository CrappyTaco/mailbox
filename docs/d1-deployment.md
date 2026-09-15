# Deploy the existing mailbox Worker with D1

## What is already done

- The app uses only the server-side `MAILBOX_DB` D1 binding.
- Local migrations are applied; all 30 existing local letters were imported and compared field-for-field, including artwork.
- `.local/letters-export.json` retains the original private JSON backup. `.local/mailbox-d1.sql` contains the complete D1 schema, data, triggers and migration history. Restoring that SQL into a fresh isolated D1 database was verified.
- The original local database directory is retained for recovery.
- Public access is preserved at your request. Anyone can choose either mailbox; these URLs do not authenticate a person.
- No Cloudflare database was created or deployed because Wrangler is not signed in. The production ID is still `REPLACE_WITH_MAILBOX_DB_ID`.

## Exact actions to finish production setup

1. **Codex/terminal — open this project and install dependencies.** In PowerShell:

   ```powershell
   Set-Location 'C:\Users\crapp\Desktop\Our_mailbox'
   pnpm install --frozen-lockfile
   pnpm exec wrangler login
   ```

   **Browser/Cloudflare —** complete the browser sign-in opened by Wrangler using the account containing the existing `mailbox` Worker. Return to the terminal.

2. **Codex/terminal — find or create the D1 database in that account.**

   ```sh
   pnpm exec wrangler d1 list
   ```

   If `mailbox-db` exists, record its UUID. If it does not exist, run:

   ```sh
   pnpm exec wrangler d1 create mailbox-db
   ```

   Record the returned `database_id`. This creates a database, not a second Worker or Pages project.

3. **Codex/editor — update `wrangler.jsonc`.** Replace only `REPLACE_WITH_MAILBOX_DB_ID` with that UUID. Keep `name: mailbox`, `binding: MAILBOX_DB`, `database_name: mailbox-db`, `preview_database_id: mailbox-local`, and `migrations_dir: migrations`. Keep the production origin `https://auggieisromantic.uk` and `LOCAL_PREVIEW: false`.

4. **Codex/terminal — choose the initial production data.** The prepared backup contains the **30 local letters**, not an export of any additional letters that might exist only in the previous hosted database. Preserve/export any such production-only records before switching the live Worker. Do not restore a full SQL snapshot into a nonempty D1 database.

   **To keep the 30 local letters in a newly created, empty D1 database**, run this **before** applying remote migrations:

   ```sh
   pnpm exec wrangler d1 execute MAILBOX_DB --remote --config wrangler.jsonc --file .local/mailbox-d1.sql
   pnpm exec wrangler d1 migrations apply MAILBOX_DB --remote --config wrangler.jsonc
   ```

   The dump already contains the first migration and its history; the second command applies only any later pending migrations. The SQL file contains personal mail: keep it private. Restoring it transfers those letters to your Cloudflare account.

   **To start with an empty production mailbox**, run only:

   ```sh
   pnpm exec wrangler d1 migrations apply MAILBOX_DB --remote --config wrangler.jsonc
   ```

   These commands follow [Cloudflare's D1 migration workflow](https://developers.cloudflare.com/d1/reference/migrations/) and [import/export guidance](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

5. **Codex/terminal — validate, build and deploy the existing Worker.**

   ```sh
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build:cloudflare
   pnpm verify:build
   pnpm verify:worker-config
   pnpm verify:worker
   pnpm test:e2e
   pnpm deploy:cloudflare
   ```

   Port 3101 must be free for the isolated end-to-end test. `deploy:cloudflare` uses `dist/server/wrangler.json`; do not deploy the unbuilt source entry. No Git commit or push was performed by this migration. If you also deploy through Workers Builds, commit and push the reviewed changes so its next build uses the same code and database ID.

6. **Cloudflare dashboard — inspect the existing Worker.** Go to **Workers & Pages → mailbox → Bindings** and confirm the D1 binding named `MAILBOX_DB` points to `mailbox-db`. Under **Settings → Variables and Secrets**, confirm `APP_ORIGIN=https://auggieisromantic.uk` and `LOCAL_PREVIEW=false`. Remove the retired external-database URL and service-role secrets; D1 needs neither. The deploy command creates the binding from configuration, so a second manual binding is unnecessary.

7. **Browser — verify production.** Open [Indi](https://auggieisromantic.uk/indi) and [Auggie](https://auggieisromantic.uk/auggie). Open the current letter, reply with signed/stamped stationery, and verify delivery and read state in the other world. For failures, open **Cloudflare → Workers & Pages → mailbox → Observability → Logs** and look for `mailbox_database_failed`; the safe diagnostic distinguishes missing binding, missing migrations and D1 failure.

## Local setup on another checkout

**Terminal, repository root:**

```sh
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

No Cloudflare login or remote database is needed locally. `pnpm dev` builds and serves the compiled Worker; restart after source changes. Hot reload remains available through `pnpm dev:vinext`, whose startup is unusually slow in this Windows workspace. Open `http://localhost:3000/indi` or `/auggie`. Existing local D1 persists between runs. New migrations: `pnpm db:migrate:local`. Full commands and API routes are in [README.md](../README.md).
