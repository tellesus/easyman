# EasyMan

**Take it easy, manager.** A responsive hotel operations workspace built from the supplied V1 product specification.

Build 0.2 is a development release with seven modules, encrypted cloud storage, JSON imports, configuration backups, and a private GitHub feedback integration. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for implemented behavior and the remaining production V1 requirements.

## Develop

Use Node.js 22.13+ (Node 24 recommended).

```sh
npm run install:ci
npm run dev
```

Open the printed local URL. The initial property is clearly labeled sample data. In the local preview, Sign in with ChatGPT uses the starter's local mock account; hosted authentication is owned by Sites. API writes require authentication and same-origin requests.

## Validate

```sh
npm test
npm run typecheck
npm run build
```

Native TypeScript execution for tests needs Node 24, or Node 22 with `--experimental-strip-types`.

## Local database

Declare `d1: "DB"` in `.openai/hosting.json`. Migrations live in `drizzle/`; hosted publication applies them. After building, apply each new migration to the local preview once, in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_romantic_spacker_dave.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_tricky_malcolm_colcord.sql
# Apply each subsequent new .sql migration in order, once.
```

## Spreadsheet exports

Generated drafts favor consecutive days off while keeping coverage and hard constraints. Click an employee name in Scheduling to open their file; **Edit employee → OK with split days off** removes that preference for that employee. It defaults to unchecked for new and existing profiles and affects the next generation, not existing assignments.

In Scheduling, select the week and use **Export schedule**. The `.xlsx` workbook contains a weekly matrix and a filterable shift table, including overnight end dates and scheduled-hour totals. Draft and published schedules are labeled as shown in the app.

In Housekeeping, use **Export room board**. The `.xlsx` workbook contains an attendant workload summary and the current room assignments, including room flags, cleaning status, locked assignments, fractional points, and unassigned/DND rooms. Room numbers remain text so leading zeros are preserved.

Both downloads are generated in the browser from the current workspace. They use the standard Office Open XML workbook format for Excel, LibreOffice Calc, and Google Sheets import. They contain operational assignments only. Coaching, discipline, employee availability, and guest pass-on records are excluded. Totals use standard spreadsheet formulas with cached results. Editing a downloaded file does not change EasyMan.

## Feedback destination

Configure the four environment names in `.env.example` through server-side Sites secrets. Install a GitHub App only on the intended private feedback repository with Issues write and the inherent metadata read permission. Use `owner/repository` for `GITHUB_FEEDBACK_REPOSITORY`. The backend signs short-lived App JWTs and obtains repository-limited installation tokens. Repository privacy is checked before submission. Without configuration, users can preserve and copy feedback drafts; the app reports submission unavailability.

## Team access, encryption and recovery

Records use separate browser-generated keys wrapped to approved account keys. Account options exports an encrypted account recovery file; keep its passphrase safely. Configuration backups are separate. Team & sessions manages invitations, employee links, capabilities, scope, and session revocation. A different full administrator can approve account recovery and provision keys. Loss of every authorized private key and recovery file means loss of plaintext access. See IMPLEMENTATION.md for deployment prerequisites and trust boundaries.

## Background snapshots

The owner-authenticated `/mcp` endpoint exposes `capture_shift_snapshots` and the read-only `snapshot_status`. The linked hourly task checks for due boundaries while browsers are closed. Every completed background check records a metadata-only receipt, including zero-capture checks. Shift pass-on → Snapshots shows the last background check independently of browser capture. The server preserves historical encrypted state at exact boundaries without decrypting hotel contents. See TESTING_CHECKLIST.md for single-computer acceptance checks.

## Project structure

- `app/workspace.tsx`: responsive UI and workflows.
- `app/domain.ts`: scheduling, boards, reporting graph, imports, and sample data.
- `app/vault.ts`, `app/team-crypto.ts`, `app/access.ts`: encryption, scoped records, and capability checks.
- `app/team-client.ts`, `app/team-server.ts`, `app/team-panel.tsx`: membership, key provisioning, sessions, and recovery.
- `app/api/`: authenticated ciphertext persistence, audit events, and private feedback submission.
- `db/schema.ts` and `drizzle/`: D1 tables and migrations.
- `.openai/hosting.json`: private Site identity and storage binding.

The Windows author's runtime and package-manager compatibility shim are ignored under `.sites-runtime/` and never deployed. The standard starter scripts remain portable.

Private GitHub feedback is configured and live-tested. Build 0.2 remains a development release while acceptance checks are recorded in TESTING_CHECKLIST.md. Checks needing other accounts or hardware are explicitly deferred. No 1.0 tag or release is created by this development build.

### Opening another browser or device

Sign in with the same ChatGPT account. If EasyMan asks for an account recovery file, return to a browser where the workspace already opens and use **Account options → Download recovery file**. Choose a recovery passphrase yourself. In the new browser, select `easyman-account-recovery.json` and enter that same passphrase. Account recovery files are separate from configuration backups and working copies; signing in does not transfer the encryption key. Keep the working browser available until the other browser opens successfully.
