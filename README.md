# EasyMan

**Take it easy, manager.** A privacy-focused hotel operations application being built for reliable daily use by hotel managers and their teams.

EasyMan is currently in development and testing, with fictional records and no customer properties. Its intended live-use scope remains intact. The build metadata is `1.0.0`; that number does not establish release readiness. The current review has 14 open findings; the older-data compatibility concern numbered 12 is withdrawn because incompatible examples can be reset. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Start with the current documents

| Document | Purpose |
| --- | --- |
| [CURRENT_SPEC.md](CURRENT_SPEC.md) | Agreed requirements, including the owner's subsequent updates. |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Existing architecture/features and known limitations. |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Stable review IDs, evidence and original-scope completeness checks. |
| [ROADMAP.md](ROADMAP.md) | Remaining work toward a credible live release. |
| [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) | Single-computer checks, historical evidence and untested areas. |
| [LIVE_TESTING.md](LIVE_TESTING.md) | Hosted testing at [easyman.app](https://easyman.app/) and domain/authentication evidence. |
| [SNAPSHOT_OPERATIONS.md](SNAPSHOT_OPERATIONS.md) | Native unattended snapshots and operational checks. |
| [RECOVERY_AND_ROLLBACK.md](RECOVERY_AND_ROLLBACK.md) | Keys, backups, working copies, development resets and rollback. |
| [FEEDBACK_SETUP.md](FEEDBACK_SETUP.md) | Private GitHub feedback integration and maintenance. |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | Development change record and release-status context. |
| [Housekeeping example](examples/housekeeping/README.md) | Fictional PMS-to-JSON walkthrough. |

Owner-requested changes update the specification. Distinguish required behavior, code currently present and checks actually performed. Disposable test data removes unnecessary compatibility work; it does not excuse incomplete workflows or weaker security.

## Develop and validate

Use Node.js 22.13+; Node 24 is recommended for native TypeScript test execution. Node 22 requires `--experimental-strip-types` for those tests.

```sh
npm run install:ci
npm run dev
```

Open the printed local URL. The local preview uses the starter's mock sign-in identity. Hosted sign-in is provided by Sites; mock authentication is not evidence of the hosted identity flow.

```sh
npm test
npm run typecheck
npm run build
```

The latest recorded application check run, on October 10 at source `7e283d3617701c7379dc63ed47c58bb5c67fba65`, passed 77 tests, type checks and the deployment build. The later review found workflow combinations those checks missed. Consult the checklist for evidence and rerun relevant checks when implementing fixes.

## Local database

The existing `.openai/hosting.json` binds D1 as `DB`. Migrations live in `drizzle/`; the managed publishing flow applies them to hosting. For local preview, build and apply new migrations in order, once each:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_romantic_spacker_dave.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_tricky_malcolm_colcord.sql
# Apply each subsequent new .sql migration in order, once.
```

There is no requirement to migrate incompatible examples solely to retain their contents. A deliberate development reset must identify its target and produce valid fresh data; these setup commands are not a reset procedure.

## Common workflows

In Scheduling, click an employee name to open their file. **OK with split days off** removes that employee's consecutive-days-off preference from the next generation. Leave it unchecked to prefer adjoining days off. Existing issues with preservation of richer availability and schedule editing are listed in the known-issues register; this guidance does not mark them fixed.

In Housekeeping, select a date and use **Set up day / Update day**. Copy the provided room-catalog prompt into the hotel's approved external LLM with its PMS report, then upload/paste the JSON result and review validation before applying. Manual room selection is also available. Omitted rooms have No service. First-time setup balances by default; same-day updates retain attendants unless balancing is selected. **Keep with this attendant** protects an assignment during rebalancing, while DND is a separate hold. Daily attendant selection and scoped service display still need the fixes recorded as issues 4 and 3.

**Export schedule** produces a weekly matrix and shift detail. **Export room board** produces a manager summary/overview and one portrait Letter handout per attendant. Select an attendant tab and print the current sheet. The handout has service/priority, Done checks and notes; an X indicates already marked clean at export. Internal IDs and assignment-lock fields are omitted. Room numbers retain leading zeros and numeric hours/points remain numeric. Files are `.xlsx` for Excel, LibreOffice and Google Sheets import; file edits do not update EasyMan. Issue 15 tracks export capability enforcement.

## Accounts and background work

For another browser, sign in with the same account. If recovery is requested, use **Account options → Download recovery file** in a working browser and import the passphrase-encrypted account recovery file in the new browser. Configuration backups and working copies serve different purposes. See the recovery guide for details and the outstanding administrator-approval session defect.

Snapshots are created by native Cloudflare application infrastructure while the browser and ChatGPT are closed. At each historical shift boundary, new-data snapshots exclude items completed for **12 elapsed hours or more**; unresolved/recently completed items remain. Later notes do not restart completion age. Manual/browser checks cannot certify the native timer. The old AI automation is user-managed cleanup and is not a runtime dependency. See the snapshot guide for receipts, catch-up and current viewer limitations.

Feedback uses a server-side GitHub App and the separate private repository `tellesus/easyman-feedback`. Credentials remain in server secrets; no connection to an AI conversation is needed to submit feedback. The public source repository is `tellesus/easyman`.

## Source layout

- `app/workspace.tsx`, `app/housekeeping-ui.tsx`: UI, forms and workflows.
- `app/domain.ts`, `app/housekeeping.ts`: scheduling, configuration and dated boards.
- `app/vault.ts`, `app/team-crypto.ts`, `app/access.ts`: encryption and access policy.
- `app/team-client.ts`, `app/team-server.ts`, `app/team-panel.tsx`: persistence, membership, keys and sessions.
- `app/snapshot-*.ts`, `app/passon-snapshot.ts`, `infra/snapshot-scheduler/`: encrypted capture and native timer.
- `app/api/`, `db/schema.ts`, `drizzle/`: server operations, schema and migrations.
- `.openai/hosting.json`: managed Site identity and storage binding.

The author's Windows runtime helpers and private local test artifacts are ignored under `.sites-runtime/` and `outputs/`. They are not deployed application dependencies. Preserve the current hosting audience unless the owner requests a change.
