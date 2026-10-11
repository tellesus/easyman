# Native shift snapshot operations

EasyMan is being built for reliable use by hotel managers and teams. The hosted environment at `https://easyman.app/` currently contains fictional development/test data and has no customers. This guide describes the native snapshot implementation and how to verify it; it is not a release sign-off. Product requirements are maintained in [CURRENT_SPEC.md](CURRENT_SPEC.md), with outstanding defects in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

Automatic snapshots are application infrastructure. They must work without ChatGPT, a connected plugin, a logged-in visitor or an open browser. The earlier hourly AI automation is obsolete and is not part of the supported implementation. The owner is handling its deletion; this guide does not claim that deletion has occurred. Old AI/manual receipts cannot prove the native scheduler ran.

## Components

- `infra/snapshot-scheduler/worker.ts`: Cloudflare scheduled handler, once per minute. It has no public endpoint, workers.dev or preview URL, and holds no hotel database or record decryption key.
- The Sites application/database: validates Ed25519-signed, short-lived requests at `/api/internal/shift-snapshots`, then captures encrypted state for each property's configured shift boundary. The public brochure does not authorize this endpoint. Browser and manual connector catch-up use the same capture engine but do not replace automatic operation.
- `0006_native_snapshot_scheduler.sql`: job lease/cursor and one current native receipt per property. `0007_passon_snapshot_cutoff.sql`: authenticated expiry metadata and a stored snapshot-policy version.
- Shift pass-on → Snapshots: displays native automatic-check health independently of browser/manual checks. The snapshot viewer still omits some frozen operational details; see known issue **11**. Capturing those details is not equivalent to presenting a complete usable handover.

The scheduler and Sites database are in different hosting accounts, so the integration uses HTTPS with the platform's private service bearer plus an application signature. It does not call Cloudflare's management API at runtime. Secrets remain in Cloudflare/Sites environment settings, outside source and checked-in configuration.

## Configuration and deployment

Cloudflare account: `853fc09403983f79e49755d1166270c5`; Worker: `easyman-snapshot-scheduler`; cron: every minute UTC. Each property's configured time zone determines its shift boundaries.

Worker secrets:

- `SNAPSHOT_SIGNING_JWK`: Ed25519 private signing JWK.
- `SITES_SERVICE_TOKEN`: private Sites service bearer.

Worker nonsecret variable: `SNAPSHOT_ORIGIN=https://easyman.app`.

App environment:

- `EASYMAN_SNAPSHOT_PUBLIC_JWK`: public verifier only.
- `EASYMAN_SNAPSHOT_STATUS_TOKEN`: separate secret for read-only operational monitoring.

Keep these separate from feedback credentials. Never commit or print private keys or bearer/status tokens. Coordinate changes to the app verifier and Worker signing secret; after rotation, verify a real native invocation with the new pair. Updating the platform bearer also requires updating the Worker's matching secret.

Before deployment, generate Worker types using the checked-in Wrangler configuration, check application types and relevant tests, and dry-run the Worker build. Deploy the compatible app/schema/environment first and scheduler second, then confirm the cron is enabled. Allow for provider propagation. Deployment success alone is not acceptance evidence.

## Boundary policy and current behavior

At each shift boundary, exclude any item that has continuously been **Completed for 12 elapsed hours or more**. Include all unresolved items and items completed less than 12 hours earlier. Exactly 12 hours is excluded. Item creation age is irrelevant. Notes do not reset the completion clock; reopening includes the item again, and completing it again starts a new clock.

Catch-up must evaluate the item's historical state and completion time at the boundary, not its state or age when the job eventually runs. Snapshot contents are frozen for that boundary. This rule supersedes the earlier discussion of a 24-hour age cutoff.

For newly written pass-ons, AAD version 2 authenticates an expiry timestamp alongside the encrypted content. The capture engine uses that metadata to exclude expired records without decrypting hotel records. New snapshots store policy version 1 and the property's time zone. Existing stored snapshots are not rewritten by the current code.

Compatibility code currently upgrades older current pass-ons on an authorized save and filters legacy historical versions in the viewer when they lack expiry metadata. That fallback is an implementation detail, **not a requirement to preserve legacy examples**. Known issue **12** was withdrawn as a compatibility blocker: incompatible fictional data/history can be reset and regenerated when adopting the corrected standard. No historical backfill is required solely to preserve disposable test data. Future new records and captures still need to meet the boundary rule. No data reset is performed by this documentation update.

The native job takes a 90-second lease, rotates through up to eight properties per tick and processes up to 16 historical boundaries per property. The capture engine scans a bounded historical date window; later ticks continue catch-up. Failed properties retain failure receipts while healthy properties continue. Transient transport/server errors receive bounded retries, and subsequent cron ticks retry. Boundary IDs and atomic snapshot/audit inserts prevent duplicate captures.

Zero newly due snapshots is a valid successful check. Native receipt rows record the check without adding thousands of zero-work audit entries. The server retains ciphertext and wrapped recipient keys rather than decrypting hotel records. Boundary/time-zone and daylight-saving behavior remain part of the testing checklist; a recent health receipt alone does not verify every boundary case.

## Verification and incidents

1. Check the deployed Worker's cron and configuration. Automatic capture must depend only on the application infrastructure.
2. Wait for a real scheduled invocation, then read its persisted native receipt. A manually triggered capture does not verify cron. `/api/internal/shift-snapshots/status` requires the private platform bearer and `X-EasyMan-Snapshot-Status`; it returns aggregate timestamps/counts only.
3. Inspect Shift pass-on → Snapshots. Expect a recent automatic check, including valid zero-capture checks. Receipts older than five minutes, or the longer rotation allowance for many properties, display an overdue warning.
4. Using fictional records, save an open pass-on before a boundary, close the app, edit it after the boundary, and confirm the snapshot contains the earlier state. Also verify recent completions, the exact 12-hour cutoff, older completions, later notes and reopening. Inspect stored capture results as well as the viewer so display filtering cannot stand in for correct capture.
5. After the viewer is corrected, verify the frozen notes, owner, priority, room, follow-up and escalation details are accessible in the historical handover. Keep this distinct from the already implemented capture mechanism.

On failure, inspect scheduled invocation logs, enabled cron, signing secret, app verifier and platform bearer. Keep logs limited to status/counts without secrets or hotel record content. Check app schema/storage health and property time-zone/boundary settings. Correct the cause and confirm a fresh native success; retained compatible history permits later ticks to catch up. Do not substitute an AI automation for the native scheduler.

For a code rollback, assess endpoint, schema, encryption-metadata and scheduler compatibility first. Stop only this Worker's cron before reverting to an application version that cannot accept its requests. Re-enable it after a compatible deployment and verify a real tick. Browser catch-up is useful but does not satisfy automatic operation while closed. Fictional data may be deliberately reset if incompatible; preserve deployment configuration and credentials unless their replacement is part of the intended work. See [RECOVERY_AND_ROLLBACK.md](RECOVERY_AND_ROLLBACK.md).

Historical native-run evidence and its limits are recorded in [LIVE_TESTING.md](LIVE_TESTING.md). Use [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for the current verification plan.

## Public website routing update

The brochure is public at `https://easyman.app/`; open the authenticated workspace at **https://easyman.app/app** for the procedures in this guide. Website visibility does not grant property access. Keys, database, recovery and signed native snapshot endpoints are unchanged. See [WEBSITE.md](WEBSITE.md).
