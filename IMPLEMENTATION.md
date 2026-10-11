# EasyMan implementation status

Documentation aligned October 10, 2026. Application review baseline: `7e283d3617701c7379dc63ed47c58bb5c67fba65` (managed source), mirrored by GitHub commit `064791a8c9465454ab0109c111ad59e8350914f8`. All 14 actionable original review findings and C1/C2 are resolved with local verification. The review baseline remains the historical reference for the original findings.

EasyMan is being built for real hotel operations. Today it is in development/testing with fictional records and no customers. The package/app/feedback metadata value `1.0.0` is not a declaration that the agreed V1 workflows are complete. The current requirements are in [CURRENT_SPEC.md](CURRENT_SPEC.md), with pending work in [ROADMAP.md](ROADMAP.md).

## Feature status

“Present” means the implementation exists, not that every user/data combination has passed acceptance. Review IDs refer to [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

| Area | Implementation present | Known gap or verification limit |
| --- | --- | --- |
| Home and property setup | Responsive navigation/dashboard; sample or empty setup; configurable property/timezone, departments, positions, shifts, rooms/types and staffing. | Room-type defaults initialize new-room scores; browser-verified overrides/reset (fixed 14). Narrow name edits retain reporting without configuration authority (fixed 5). |
| Scheduling | Generation, hard availability/qualification checks, configured rest/generator hour limits, preferences/seniority, partial generation, manual edits, publication and preserved published copies. Names open employee files; split-day consent defaults off. | Fixed and locally verified: availability preservation (1), reassignment (2), narrow edits (5) and source/destination publication invalidation (7). Fixed: protected coverage (6), desired-hour allocation/quality (9), deliberate maximum/rest overrides (10), and per-assignment times throughout constraints/views/history/XLSX (C1). |
| Daily housekeeping | Dated plans; room-catalog prompt; JSON paste/upload, validation/review; manual service selection; first-day point balancing, same-day opt-in balancing; kept assignments, progress, DND, daily overrides and historical boards. | Fixed and locally verified: dated scoped service (3), saved working-today roster/removal/authorized schedule suggestions (4), room-type score initialization (14). Actual hosted-team and real PMS acceptance remain untested. |
| Exports | Schedule matrix/detail, numeric totals/overnight dates; room-board manager sheets and portrait Letter handouts; leading-zero identifiers; internal IDs/locks omitted. | Actual capability/view/scope intersection now governs exports (fixed 15). Available-app checks are separate from untested spreadsheet applications. |
| Room checks | Inspection creation, results, notes, linked rechecks and history. | Attendant/category/date fields, separate linked rechecks and all original history filters are implemented and locally verified (C2). |
| Coaching/discipline | Scoped records, incident timestamps, follow-ups and preserved material revisions. | Acknowledgment survives unrelated edits and reload with preserved revisions (fixed 13). |
| Pass-on | Ownership, notes/follow-ups, escalation, completion/archive, overdue display and selected-item privacy-conscious 16:9 briefings. | Frozen snapshot viewer shows operational detail/history using captured values and time zone (fixed 11). |
| Snapshots | Native every-minute Cron, signed requests, encrypted historical capture, leases, retries, bounded catch-up and native health receipts; authenticated 12-hour completion expiry for new records. | Viewer issue 11 is fixed. Legacy-history compatibility concern 12 is withdrawn as required work; incompatible examples can be reset. Native zero-work receipts do not alone verify boundary contents. |
| Configuration imports/recovery | Schema/example/prompt, date/reference/field validation, preview/confirm; encrypted/plaintext configuration export, defaults merge/restore and encrypted working-copy recovery. Related daily plans/tasks restore together. | Normal recovery/history correctness remains required. No need to preserve incompatible old examples merely to avoid a development reset. |
| Membership/security | Invitations, account/employee association, capabilities/scopes, encrypted keys, sessions, audit records, stale-write detection and recovery. | Narrow editing (5) and recovery approval sessions (8) are fixed and locally verified. Export capability (15) is fixed. Actual hosted multi-user acceptance is untested. |
| Feedback | Encrypted drafts, compose/review, server GitHub App submission to the private destination, labels, privacy check and retry/deduplication. | Synthetic integration tests are recorded; no customer usage is claimed. Full two-way issue synchronization is outside V1. |

## Architecture and trust boundaries

Hosted authentication supplies a signed-in identity; application membership and capability/scope policy govern property data separately from the Site audience. Invitations bind to signed-in email and require approval/key provisioning. Reporting relationships and explicit grants determine scope rather than title alone. A sample access-profile preview is a UI demonstration, not evidence that a real user's permissions work. The first batch adds client/server enforcement for safe publication downgrades: AAD version 3 authenticates publication weeks, so editors can remove weeks but cannot publish new ones. Stored ciphertext with contradictory content cannot override that authenticated metadata. Migration 0008 adds its metadata column; the server continues to keep hotel record contents encrypted.

The browser encrypts records using random AES-256-GCM keys wrapped to authorized RSA-OAEP account keys. Associated data authenticates property/record/module/subject identity. Sensitive employee fields, availability, scheduling preferences, coaching and discipline use distinct resource types. The server stores ciphertext, wrapped keys and metadata needed for authorization/history; the scheduler does not decrypt hotel records. Delivered application code and server/platform authorization remain trusted; this is not protection against a compromised client or malicious replacement code.

Application sessions use hashed random tokens, HttpOnly/Secure/SameSite cookies and a 12-hour expiry, plus review/revocation controls. Membership disabling is separately enforced. Recovery approval/listing now checks the application session (fixed issue 8), in addition to identity and administrator membership. Request bootstrap is separate. Synthetic route checks passed; actual hosted second-administrator acceptance is still untested.

Server paths include same-origin/body-size controls, rate limiting, response security headers, revision leases and transactional resource/audit persistence. Encrypted revisions and audit records support history; property users have no audit-delete endpoint. Infrastructure administrators still control storage. The new route tests exercise reassignment in both scopes, narrow employee/draft saves, publication escalation/tampering and revoked recovery approval. These passes do not establish all read/write/action combinations.

Account recovery files encrypt the account private key with a user-chosen passphrase. Other-browser sign-in needs recovery of that key. Administrator-assisted recovery can provision keys through an authorized client. Loss of all authorized keys/recovery files prevents plaintext recovery. Configuration backups, working copies and snapshots are distinct artifacts; see [RECOVERY_AND_ROLLBACK.md](RECOVERY_AND_ROLLBACK.md).

Older workspace/record migrations and viewer fallbacks remain in the code. They describe implementation history, not a requirement to maintain every old example format. Correct changes may replace incompatible fictional data with fresh examples; no reset occurred in this documentation pass.

## Native snapshot execution

`infra/snapshot-scheduler/worker.ts` runs every minute in the owner's Cloudflare account, separately from the managed Sites app/database. It has no public request endpoint. Its private service bearer and short-lived Ed25519 signature authenticate requests to `/api/internal/shift-snapshots`. Runtime execution is ordinary application infrastructure, independent of AI conversations, installed plugins and open browsers.

The app reconstructs boundary state from encrypted current/historical resource versions. The new-data 12-hour policy compares authenticated expiry against the historical boundary: exclude Completed items at or beyond 12 hours, include unresolved/recently completed items, and preserve earlier state when later notes or completion occur. Repeated capture is idempotent. Native leases, per-property receipts, rotation, retries and bounded catch-up handle delayed/overlapping checks; see [SNAPSHOT_OPERATIONS.md](SNAPSHOT_OPERATIONS.md) for operational limits.

Browser catch-up and owner-authenticated `/mcp` tools remain auxiliary capture/status paths. Their receipts do not establish native timer health. The old AI automation is not part of the required runtime, and its deletion is being handled by the owner.

Historical versions without expiry metadata can still use a viewer filter in the current code. Finding 12 explains this but is withdrawn as a required preservation/backfill task. New-data stored capture must obey the rule. A complete frozen-item viewer is still pending (11).

## Verification record

At the reviewed application revision, the latest recorded local run passed **77 automated checks, type checks and the deployment build**. Coverage includes selected scheduling/import/housekeeping rules; workbook structure; access/encryption/key recipients; actual storage handlers with synthetic identities; stale writes; recovery-file validation; feedback privacy/idempotency; and snapshot history, expiry, scheduler authentication and job behavior. This is a historical run, not a newly claimed run of every revision.

The focused review subsequently reproduced combinations absent from that suite. Owner-reported checks, assistant browser checks, simulated handler checks and actual external-service checks are recorded separately in [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) and [LIVE_TESTING.md](LIVE_TESTING.md). October 9 snapshot evidence predates the native scheduler. October 10 native receipts demonstrate genuine scheduled execution, with zero captured boundaries in the cited runs; closed-browser boundary/content acceptance remains distinguishable from those receipts.

Real-team identity flows, another administrator, actual phone/tablet hardware and genuine PMS reports are unavailable at this stage. Those are validation limits, not removed requirements or invented customer prerequisites. Continue with the useful checks possible here. Do not describe an entire module as accepted merely because a narrow test passed.

## First fix batch verification

The complete suite now passes **84 tests**, including 7 new domain/actual-handler cases. Type checks and the deployment build pass. The local device workspace verified a richer restriction surviving name/consent edits and reload, plus changing its date through the structured editor. This does not establish a real hosted multi-user recovery flow. The initial sandbox run could not access the local Workers test server; the full suite passed with localhost permissions. No hosted example-data reset was performed.

## Second fix batch — daily housekeeping

Issues 3, 4 and 14 are fixed. Dated tasks supply scoped service without giving staff the full private daily plan. Explicit per-day attendants are stored in the encrypted plan; new days start empty and rebalancing uses only selected qualified staff. Manual roster selection supports external scheduling; authorized schedule suggestions exclude unavailable shifts. Removing staff releases assignment locks after an explicit warning, retaining task identity/progress/holds/scores. Daily plans without a confirmed roster require Working today before rebalancing. No hosted example reset or data backfill was performed.

Add room uses active room-type defaults, preserves intentional overrides on type changes, and offers a reset to the selected type default. The full suite passes **90/90 tests**, TypeScript and the deployment build. Actual storage readback checks encrypted roster retention and scoped service/plan denial; local browser checks cover import, roster removal/rebalance/reload and room defaults/overrides/save/reload. Those remaining findings and C1/C2 were subsequently completed in the final batch below.

## Final corrective batch — October 10, 2026

The complete suite passes **99/99 tests**, TypeScript checks and the deployment build. New focused cases cover protected full/partial coverage, feasible 8/40-hour allocation, hour/rest override acknowledgment, custom-time constraints/XLSX, real capability/scope exports, inspection details/rechecks/all filters, acknowledgment revisions and frozen snapshot rendering. An actual encrypted storage/readback test preserves custom schedule fields, inspection attendant/category, acknowledgment/history and captured owner/note details. Local browser checks saved/reloaded custom times with a deliberate weekly-limit override, separate inspection/recheck/filter history and an unrelated discipline edit retaining Acknowledged. Tests use fictional records and isolated identities; no hosted examples were reset.

All review fixes and C1/C2 are complete. Owner-private publication is a test candidate; an official release/audience decision remains explicit. No real team, actual PMS export or phone/tablet acceptance is claimed.

## Public website / app routing and license

`app/marketing.tsx` and `app/marketing.css` provide the public brochure at `/`. Static fictional feature previews are interactive illustrations, not an operational demo. `/app` authenticates server-side before rendering the workspace; existing APIs still enforce account/property/action/scope/session access. Legacy property/invitation routes forward to `/app`, and new invitation links/sign-in returns use that path. `/license`, robots and sitemap describe the public pages and source offer. The public hosting audience exposes the brochure; it does not grant property access. DNS, database, native scheduler and secrets are unchanged. Original material is AGPL-3.0-only with retained vendor notices. See WEBSITE.md and LICENSING.md.

## Interactive demo

The independent demo is at **https://demo.easyman.app/**; registered-user sign-in remains **https://easyman.app/app**. The demo uses the shared workspace with an explicit in-memory runtime, static hosting and no database, credentials, authentication or persistent browser storage. Reset/refresh starts fresh examples. Cloud-dependent account actions are explained as unavailable, feedback is a local preview, and snapshots are labeled fictional. Real spreadsheet exports and supplied PMS-report/JSON examples work locally. See [DEMO.md](DEMO.md). The updated complete suite passes **107/107 tests** and TypeScript checks. Earlier 99/101 counts describe earlier batches.
