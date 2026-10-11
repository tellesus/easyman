# EasyMan

**Take it easy, manager.** A privacy-focused hotel operations application being built for reliable daily use by hotel managers and their teams.

EasyMan is currently in development and testing, with fictional records and no customer properties. Its intended live-use scope remains intact. The build metadata is `1.0.0`; that number does not establish release readiness. All 14 actionable original review findings and completeness checks C1/C2 are fixed and locally verified; the older-data compatibility concern numbered 12 is withdrawn because incompatible examples can be reset. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

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

The review baseline at source `7e283d3617701c7379dc63ed47c58bb5c67fba65` passed 77 tests but missed the reviewed workflow combinations. The completed corrective work passes 99 tests, type checks and the deployment build. Consult the checklist for evidence and remaining issues.

## Local database

The existing `.openai/hosting.json` binds D1 as `DB`. Migrations live in `drizzle/`; the managed publishing flow applies them to hosting. For local preview, build and apply new migrations in order, once each:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_romantic_spacker_dave.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_tricky_malcolm_colcord.sql
# Apply each subsequent new .sql migration in order, once.
```

There is no requirement to migrate incompatible examples solely to retain their contents. A deliberate development reset must identify its target and produce valid fresh data; these setup commands are not a reset procedure.

## Common workflows

In Scheduling, click an employee name to open their file. **OK with split days off** removes that employee's consecutive-days-off preference from the next generation. Leave it unchecked to prefer adjoining days off. Profile saves now preserve richer availability and stable reporting links; additional availability rules have date, weekday, shift and position controls. Authorized reassignment, draft saves without publish permission, and cross-week invalidation are corrected. Remaining scheduling issues are listed in the issue register.

In Housekeeping, select a date and use **Set up day / Update day**. Copy the provided room-catalog prompt into the hotel's approved external LLM with its PMS report, then upload/paste the JSON result and review validation before applying. Manual room selection is also available. Omitted rooms have No service. First-time setup balances by default; same-day updates retain attendants unless balancing is selected. **Keep with this attendant** protects an assignment during rebalancing, while DND is a separate hold. Choose who is **Working today** during setup; only the saved daily roster receives rebalance assignments. Schedule suggestions are optional and require the relevant access. Removing staff releases their assignments/locks after a warning while retaining cleaning progress. An empty roster leaves rooms unassigned. Scoped attendants see the service stored on their dated tasks. Add room uses the selected room type’s workload default, with an explicit override/reset option.

**Export schedule** produces a weekly matrix and shift detail. **Export room board** produces a manager summary/overview and one portrait Letter handout per attendant. Select an attendant tab and print the current sheet. The handout has service/priority, Done checks and notes; an X indicates already marked clean at export. Internal IDs and assignment-lock fields are omitted. Room numbers retain leading zeros and numeric hours/points remain numeric. Files are `.xlsx` for Excel, LibreOffice and Google Sheets import; file edits do not update EasyMan. Exports enforce the actual account’s capability and authorized employee/module scope.

## Accounts and background work

For another browser, sign in with the same account. If recovery is requested, use **Account options → Download recovery file** in a working browser and import the passphrase-encrypted account recovery file in the new browser. Configuration backups and working copies serve different purposes. Administrator approval now rejects revoked application sessions; bootstrap recovery requests remain usable. See the recovery guide for the procedures and verification limits.

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

Scheduling now counts protected assignments as fixed coverage, uses desired-hour targets, shows Schedule quality, and supports individual time/hour adjustments. Manual hour/rest warning overrides require acknowledgment and a saved reason; hard eligibility and overlap checks remain. Room checks record attendant/category/date and expose full history filters with separate rechecks. Snapshots show frozen operational details/notes; discipline edits preserve acknowledgment. See the issue register and testing checklist for verification and release limits.

## Public website and license

The public introduction is at [easyman.app](https://easyman.app/); the authenticated workspace is at [easyman.app/app](https://easyman.app/app). Try the separate [interactive demo](https://demo.easyman.app/) without signing in. It uses temporary fictional data and resets on refresh. Website visibility does not grant property-record access. See [WEBSITE.md](WEBSITE.md) for routes, deployment audience and verification.

EasyMan original code/documentation is licensed under **AGPL-3.0-only**. Copyright © 2026 Michael Leza and EasyMan contributors. See [LICENSE](LICENSE) and [LICENSING.md](LICENSING.md); third-party notices are retained. Modified hosted versions must offer their corresponding source to network users under section 13. The software is provided without warranty.

The public-website update passes **101/101 tests** and TypeScript checks; the earlier 99-test count describes the completed review-fix batch. Current source is available through the website/app license links.

## Interactive demo

The independent demo is at **https://demo.easyman.app/**; registered-user sign-in remains **https://easyman.app/app**. The demo uses the shared workspace with an explicit in-memory runtime, static hosting and no database, credentials, authentication or persistent browser storage. Reset/refresh starts fresh examples. Cloud-dependent account actions are explained as unavailable, feedback is a local preview, and snapshots are labeled fictional. Real spreadsheet exports and supplied PMS-report/JSON examples work locally. See [DEMO.md](DEMO.md). The updated complete suite passes **107/107 tests** and TypeScript checks. Earlier 99/101 counts describe earlier batches.
