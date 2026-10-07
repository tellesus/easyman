# EasyMan

**Take it easy, manager.** A responsive hotel operations workspace built from the supplied V1 product specification.

Build 0.1 is an owner-only pilot with seven modules, encrypted cloud storage, JSON imports, configuration backups, and a private GitHub feedback integration. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for implemented behavior and the remaining production V1 requirements.

## Develop

Use Node.js 22.13+ (Node 24 recommended).

```sh
npm run install:ci
npm run dev
```

Open the printed local URL. The initial property is clearly labeled sample data. In the local preview, Sign in with ChatGPT uses the starter's local mock account; hosted authentication is owned by Sites. API writes require authentication and same-origin requests.

## Validate

```sh
node --test scripts/test-domain.mjs scripts/test-exports.mjs
npx tsc --noEmit
npm run build
```

Native TypeScript execution for tests needs Node 24, or Node 22 with `--experimental-strip-types`.

## Local database

Declare `d1: "DB"` in `.openai/hosting.json`. Migrations live in `drizzle/`; hosted publication applies them. After building, apply each new migration to the local preview once, in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_romantic_spacker_dave.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_tricky_malcolm_colcord.sql
```

## Spreadsheet exports

In Scheduling, select the week and use **Export schedule**. The `.xlsx` workbook contains a weekly matrix and a filterable shift table, including overnight end dates and scheduled-hour totals. Draft and published schedules are labeled as shown in the app.

In Housekeeping, use **Export room board**. The `.xlsx` workbook contains an attendant workload summary and the current room assignments, including room flags, cleaning status, locked assignments, fractional points, and unassigned/DND rooms. Room numbers remain text so leading zeros are preserved.

Both downloads are generated in the browser from the current workspace. They use the standard Office Open XML workbook format for Excel, LibreOffice Calc, and Google Sheets import. They contain operational assignments only. Coaching, discipline, employee availability, and guest pass-on records are excluded. Totals use standard spreadsheet formulas with cached results. Editing a downloaded file does not change EasyMan.

## Feedback destination

Configure the four environment names in `.env.example` through server-side Sites secrets. Install a GitHub App only on the intended private feedback repository with Issues write and the inherent metadata read permission. Use `owner/repository` for `GITHUB_FEEDBACK_REPOSITORY`. The backend signs short-lived App JWTs and obtains repository-limited installation tokens. Repository privacy is checked before submission. Without configuration, users can preserve and copy feedback drafts; the app reports submission unavailability.

## Encryption and recovery

The random workspace key remains on the client. Property Settings → Backups & security lets the owner copy a recovery key for a new device. Configuration backups use a separate user-provided passphrase. Losing all copies of the workspace key loses access to the encrypted workspace. Team access and administrator recovery require the subsequent production security work described in IMPLEMENTATION.md.

## Project structure

- `app/workspace.tsx`: responsive UI and workflows.
- `app/domain.ts`: scheduling, boards, reporting graph, imports, and sample data.
- `app/vault.ts`: client encryption and encrypted device storage.
- `app/api/`: authenticated ciphertext persistence, audit events, and private feedback submission.
- `db/schema.ts` and `drizzle/`: D1 tables and migrations.
- `.openai/hosting.json`: private Site identity and storage binding.

The Windows author's runtime and package-manager compatibility shim are ignored under `.sites-runtime/` and never deployed. The standard starter scripts remain portable.

