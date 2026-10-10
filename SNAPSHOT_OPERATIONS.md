# Native shift snapshots

EasyMan's automatic snapshots are application infrastructure. They must work without ChatGPT, a connected plugin, a logged-in visitor or an open browser. The earlier hourly AI task was incorrect and has been removed; its old receipts remain historical evidence only.

## Components

- `infra/snapshot-scheduler/worker.ts`: Cloudflare scheduled handler, once per minute. No public endpoint, workers.dev or preview URL. This Worker holds no hotel database or decryption key.
- Existing private Sites app/database: validates Ed25519-signed, short-lived requests at `/api/internal/shift-snapshots`, then captures the encrypted state at each property's configured local boundary. Browser and manual MCP catch-up use the same snapshot engine.
- Additive migration `0006_native_snapshot_scheduler.sql`: native job lease/cursor and one current metadata receipt per property. Old snapshots, keys and audit history are retained.
- Shift pass-on → Snapshots: shows the latest native automatic check, failures and overdue checks. A browser refresh or legacy MCP run cannot produce a native receipt.

The accounts differ, so an in-process service binding to Sites' managed database is unavailable. The scheduler uses HTTPS with the platform's private service bearer plus an application signature. It never calls Cloudflare's management API at runtime. Secrets remain in Cloudflare/Sites environment settings, outside source and config.

## Configuration and deployment

Cloudflare account: `853fc09403983f79e49755d1166270c5`; Worker: `easyman-snapshot-scheduler`; cron: every minute UTC. Property time zones determine shift boundaries, independently of the cron's UTC time zone.

Worker secrets: `SNAPSHOT_SIGNING_JWK` (Ed25519 private JWK), `SITES_SERVICE_TOKEN` (private Sites service bearer). Nonsecret variable: `SNAPSHOT_ORIGIN=https://easyman.app`.

App environment: `EASYMAN_SNAPSHOT_PUBLIC_JWK` (public verifier only), `EASYMAN_SNAPSHOT_STATUS_TOKEN` (separate random read-only monitoring secret). Existing feedback secrets must remain unchanged. Rotate the signing pair by deploying the new app public verifier and Worker private secret together; never commit or print private keys. Rotating the platform bearer requires updating the Worker's matching secret.

Generate Worker types using Wrangler and the checked-in config. Check application types/tests and dry-run the Worker build. Deploy the app with its migration/environment first, deploy the scheduler next, then enable its cron. New cron changes may take up to 15 minutes to propagate. Deployment alone is not acceptance evidence.

## Runtime behavior

New snapshots exclude items whose boundary-time state was Completed for **12 elapsed hours or more**. Exactly 12 hours is excluded; just under 12 hours and all unresolved items are included. Notes do not reset the completion clock. A reopened item is included; completing it again starts a new completion clock. Catch-up evaluates the historical version at the shift boundary, rather than the capture job's later execution time. Previously stored snapshots retain their original policy and contents.

Pass-on AAD version 2 authenticates a minimal expiry timestamp alongside encrypted content. The native job can exclude expired records without decrypting hotel records. An authorized editable workspace automatically upgrades older current pass-ons on its next open/save, retaining their completion times and preserved versions. Legacy historical versions without expiry metadata remain opaque on the server; the authorized viewer applies the recorded 12-hour policy after decryption, using the frozen boundary and property time zone. Missing or malformed completion timestamps cannot establish 12 completed hours and are retained. The read-only operational probe reports the policy and count of current legacy records awaiting upgrade.

The job atomically takes a 90-second lease, rotates through up to eight properties per tick and processes up to 16 historical boundaries per property. Long outages catch up across later ticks. Failed properties retain a visible failure receipt and do not stop healthy properties. Transient transport/server errors receive bounded retries; subsequent cron ticks also retry. Immutable boundary IDs and atomic snapshot/audit inserts prevent duplicate snapshots.

Zero new snapshots is a valid successful check. Native receipt rows are updated, avoiding thousands of zero-work audit entries per day. Existing historical boundary reconstruction retains ciphertext and wrapped recipient keys without server decryption. Missing spring-forward wall times are skipped; ambiguous fall-back times use the application's documented first occurrence behavior.

## Verification and incidents

1. Read the Cloudflare cron configuration; verify no AI snapshot task remains.
2. Wait for a real scheduled invocation, then read the persisted native receipt. Do not manually call capture and claim that verifies cron. The monitoring endpoint `/api/internal/shift-snapshots/status` requires the private platform bearer and `X-EasyMan-Snapshot-Status`; it returns aggregate timestamps/counts only.
3. Inspect Shift pass-on → Snapshots. Expect a recent automatic check, including zero-capture runs. Receipts older than five minutes (or the longer rotation allowance for many properties) display an overdue warning.
4. For a handover acceptance test, save an explicitly synthetic open pass-on before a boundary, close the app, edit it after the boundary, and confirm the snapshot retains its earlier state. Automated isolated Workers tests exercise this encrypted before/after case without customer data.

On failure, check the Worker's scheduled invocation logs, its enabled cron, signing secret, app verifier and platform service bearer. Logs contain generic status/counts only. Check app storage/migration health and the property's time zone/boundaries. Correct the cause and verify a fresh native success. Retained history lets subsequent ticks catch up. Do not delete snapshots, reset account keys, recreate the property or enable an AI task as a repair.

For rollback, stop only this Worker's cron before reverting the application to a version lacking the native endpoint/tables. Keep additive tables and all encrypted records. Browser catch-up remains available, but an old version must not be described as independently scheduled. Re-enable cron only after a compatible app deployment.

Acceptance evidence is recorded in LIVE_TESTING.md after a real native tick is observed.
