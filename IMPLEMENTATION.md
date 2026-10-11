# EasyMan implementation status

Documentation aligned October 10, 2026. Application review baseline: `7e283d3617701c7379dc63ed47c58bb5c67fba65` (managed source), mirrored by GitHub commit `064791a8c9465454ab0109c111ad59e8350914f8`. Later documentation/help wording changes do not resolve the defects below.

EasyMan is being built for real hotel operations. Today it is in development/testing with fictional records and no customers. The package/app/feedback metadata value `1.0.0` is not a declaration that the agreed V1 workflows are complete. The current requirements are in [CURRENT_SPEC.md](CURRENT_SPEC.md), with pending work in [ROADMAP.md](ROADMAP.md).

## Feature status

“Present” means the implementation exists, not that every user/data combination has passed acceptance. Review IDs refer to [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

| Area | Implementation present | Known gap or verification limit |
| --- | --- | --- |
| Home and property setup | Responsive navigation/dashboard; sample or empty setup; configurable property/timezone, departments, positions, shifts, rooms/types and staffing. | Room-type defaults do not initialize new-room scores (14). Narrow employee edits have hidden permission dependencies (5). |
| Scheduling | Generation, hard availability/qualification checks, configured rest/generator hour limits, preferences/seniority, partial generation, manual edits, publication and preserved published copies. Names open employee files; split-day consent defaults off. | Availability destroyed by some profile edits (1); reassignment rejected (2); narrow edit/publication failure (5); scoped overstaffing (6); stale source-week publication (7); desired hours underused/feedback hidden (9); silent manual maximum bypass (10). Per-assignment time adjustment needs completeness check C1. |
| Daily housekeeping | Dated plans; room-catalog prompt; JSON paste/upload, validation/review; manual service selection; first-day point balancing, same-day opt-in balancing; kept assignments, progress, DND, daily overrides and historical boards. | Scoped service can be wrong (3); all active qualified employees are used without a genuine daily available pool (4); room-type score initialization (14). |
| Exports | Schedule matrix/detail, numeric totals/overnight dates; room-board manager sheets and portrait Letter handouts; leading-zero identifiers; internal IDs/locks omitted. | Actual export action capability is not enforced (15). Available-app checks are separate from untested spreadsheet applications. |
| Room checks | Inspection creation, results, notes, linked rechecks and history. | Full original attendant/category fields and history filters require completeness check C2. |
| Coaching/discipline | Scoped records, incident timestamps, follow-ups and preserved material revisions. | Discipline acknowledgment may reset on an unrelated edit (13). |
| Pass-on | Ownership, notes/follow-ups, escalation, completion/archive, overdue display and selected-item privacy-conscious 16:9 briefings. | Frozen snapshot viewer omits operational detail (11). |
| Snapshots | Native every-minute Cron, signed requests, encrypted historical capture, leases, retries, bounded catch-up and native health receipts; authenticated 12-hour completion expiry for new records. | Viewer issue 11 is open. Legacy-history compatibility concern 12 is withdrawn as required work; incompatible examples can be reset. Native zero-work receipts do not alone verify boundary contents. |
| Configuration imports/recovery | Schema/example/prompt, date/reference/field validation, preview/confirm; encrypted/plaintext configuration export, defaults merge/restore and encrypted working-copy recovery. Related daily plans/tasks restore together. | Normal recovery/history correctness remains required. No need to preserve incompatible old examples merely to avoid a development reset. |
| Membership/security | Invitations, account/employee association, capabilities/scopes, encrypted keys, sessions, audit records, stale-write detection and recovery. | Narrow-permission gaps (5), revoked-session recovery approval (8) and export capability (15). Actual hosted multi-user acceptance is untested. |
| Feedback | Encrypted drafts, compose/review, server GitHub App submission to the private destination, labels, privacy check and retry/deduplication. | Synthetic integration tests are recorded; no customer usage is claimed. Full two-way issue synchronization is outside V1. |

## Architecture and trust boundaries

Hosted authentication supplies a signed-in identity; application membership and capability/scope policy govern property data separately from the Site audience. Invitations bind to signed-in email and require approval/key provisioning. Reporting relationships and explicit grants determine scope rather than title alone. A sample access-profile preview is a UI demonstration, not evidence that a real user's permissions work.

The browser encrypts records using random AES-256-GCM keys wrapped to authorized RSA-OAEP account keys. Associated data authenticates property/record/module/subject identity. Sensitive employee fields, availability, scheduling preferences, coaching and discipline use distinct resource types. The server stores ciphertext, wrapped keys and metadata needed for authorization/history; the scheduler does not decrypt hotel records. Delivered application code and server/platform authorization remain trusted; this is not protection against a compromised client or malicious replacement code.

Application sessions use hashed random tokens, HttpOnly/Secure/SameSite cookies and a 12-hour expiry, plus review/revocation controls. Membership disabling is separately enforced. The review found that recovery approval does not yet check the application session (8), despite requiring authenticated platform identity and administrator membership. Do not claim complete session coverage until corrected.

Server paths include same-origin/body-size controls, rate limiting, response security headers, revision leases and transactional resource/audit persistence. Encrypted revisions and audit records support history; property users have no audit-delete endpoint. Infrastructure administrators still control storage. Current tests exercise selected permission paths; the open findings show that their existence is not blanket proof of all read/write/action combinations.

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
