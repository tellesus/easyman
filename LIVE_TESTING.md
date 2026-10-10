# EasyMan — live testing on easyman.app

Original acceptance session: October 9, 2026 (America/Chicago). Updated for private 1.0.0 on October 10. The owner-reported results below remain a historical record; assistant release checks are recorded separately.

## Addresses and data

- Test at https://easyman.app/.
- Keep the working fallback at https://easyman-hotel-ops.michaelleza.chatgpt.site/.
- Both addresses connect to the same Sites project, application deployment and property database. A change made through either address affects the same records. Use the sample property and fictional records for testing.
- Site access stays private to the existing allowed account. Additional testers need private Site access and separate EasyMan property invitations/approval. A custom domain does not grant either.
- Account keys and sessions belong to a browser origin. Do not rely on signing in to transfer your key. First open in another browser/origin may ask for an account recovery file. The Codex in-app browser opened the existing workspace on the new domain during this session without a recovery prompt; Michael subsequently confirmed same-account recovery and reload on this computer, including rejection of missing/wrong recovery files and wrong passphrases.

## Verified setup checks — October 9, 2026

- Sites custom-domain status active; provider hostname active; SSL certificate active.
- DNS records read back with the expected targets and ownership TXT records.
- Anonymous root, workspace API and snapshot-status API return 401 with no-store. Supplied fake identity headers do not authorize access.
- HTTP redirects to HTTPS; the sign-in route redirects to OpenAI.
- Existing account sign-in returned to https://easyman.app/ and opened The Linden House with Encrypted · saved.
- Signed-in workspace on the new domain shows the same existing records and prior activity. This is a read-only connectivity check, not completion of the functional acceptance list below.
- The custom-domain /mcp path is not exposed (anonymous 404). Keep the existing EasyMan connector on its original provisioned endpoint; no connector or snapshot schedule migration was performed.

## First sign-in on easyman.app

1. Keep EasyMan open on the original address. In Account options, enter your own recovery passphrase (at least 12 characters) and Download recovery file. Keep this file and its passphrase safe; enter the passphrase only in the app.
2. Retain an encrypted working copy and configuration backup before altering test data. These are separate from the account recovery file.
3. Open https://easyman.app/ and sign in with the same ChatGPT account.
4. If prompted, select the downloaded account recovery file and enter its passphrase. Restore the account key. Expect the same property, employees, schedule, rooms and pass-on history.
5. Reload the page. Expect the workspace to open and show Encrypted · saved. Keep the original browser available until this succeeds.

## Acceptance session — one computer

Michael reported these results on October 9, 2026 (America/Chicago): **12 passed, 1 pending**. These checkmarks record the owner’s acceptance report, not a new assistant-run test session. Housekeeping progress/locks/rebalancing/DND is the only unchecked item in this live-domain list. Multi-user and actual mobile-device checks remain deferred.

- [x] HTTPS opens without a certificate warning; the address remains easyman.app through sign-in and return navigation.
- [x] Signed-out access prompts for sign-in; it does not expose property records. Check in a private browser window without importing a key there.
- [x] Same-account recovery opens the existing property. Reload preserves it. Missing/wrong recovery files and wrong passphrases do not replace the stored key.
- [x] Create a fictional TEST pass-on, reload and update/complete it; verify archive and history. Avoid real guest information.
- [x] Click an employee name in Scheduling, save a test split-days-off preference and reload. Regenerate a draft; check availability, consecutive days off, coverage, hours and rest. Partial regeneration leaves unselected dates intact. Restore fictional preferences after testing.
- [x] Export schedule and room-board XLSX files; open in each spreadsheet app available on this computer. Preserve leading-zero room numbers, numeric hours and draft/publication labels. Owner confirmed the export checks and provided LibreOffice layout feedback. The resulting redesign adds portrait attendant handouts; assistant checks subsequently verified LibreOffice print output and live-download structure.
- [ ] Change a fictional housekeeping task, lock it and rebalance; verify cleaning progress, locks and DND behavior.
- [x] Record a room check and a separate recheck; verify history.
- [x] Check coaching/discipline revisions using invented records only. Do not treat the sample access-profile preview as proof of actual multi-user permissions.
- [x] Verify a fresh background receipt under Shift pass-on → Snapshots after a scheduled run; close the app around a boundary and confirm the frozen historical state afterward. Domain activation does not prove the task executed.
- [x] Submit explicitly synthetic feedback and verify the expected category in the private feedback repository; remove/close synthetic issues after verification.
- [x] Repeat narrow-window and keyboard checks, then restore the normal window size. Actual phones/tablets remain deferred.
- [x] Briefly disconnect/reconnect the network; expect a clear save failure/retry path with no lost local working copy. If another session changes the same workspace, follow the conflict warning and reload before editing.

The snapshot result includes a fresh scheduled background receipt, a capture with the app closed around a boundary, and frozen historical state afterward, as confirmed by Michael. This closes the previously unconfirmed scheduled-execution check.

## Assistant release review — October 10, 2026

The user authorized completing the release pass and publishing private 1.0.0. Assistant checks covered the revised housekeeping import/review/balance/progress/kept assignment/DND/history workflow, selected-date exports and LibreOffice handouts. The live six-room board was rebalanced from 1 / 3 / 4.25 to 3 / 3 / 2.25 points and reopened with those totals.

A separate localhost test workspace started empty and stayed empty after reload. A synthetic encrypted working copy was previewed/restored there; room progress, a kept assignment, DND and the restored property survived reload. Actual isolated API handlers also verified encrypted restoration into an empty property. A local schedule was published, its shift template edited and its unchanged publication history inspected; the affected live schedule correctly returned to draft. No hotel records or account keys were cleared in the hosted app.

The release candidate has 68 passing automated checks and passing TypeScript checks. The GitHub Actions browser view confirmed the pre-release commits had succeeded, despite the connector returning empty run lists. Final candidate CI/build and private deployment are verified before the v1.0.0 tag is created. Real-team, different-administrator, actual-device and actual PMS/LLM checks remain deferred. Unchecked detailed cases are not retrospectively marked passed.

Use TESTING_CHECKLIST.md to extend validation beyond this release scope, and RECOVERY_AND_ROLLBACK.md for backups and recovery.

## Hosting record and rollback

The existing Sites service runs EasyMan. Cloudflare hosts the easyman.app DNS zone; this does not deploy a second Worker or database into the owner's Cloudflare account.

- Sites project: appgprj_6ac59f72cb7881918238960fa462ddf8.
- Custom-domain binding: appgdom_6ac98e8b608081918184c990459d1284.
- Cloudflare zone: 4467476bfd1ad6c289c9ddf610859efb.
- Apex A records: 162.159.143.30 and 172.66.3.26, DNS-only, TTL 300, as returned by Sites.
- Ownership validation TXT names: _openai-site-verification.easyman.app and _cf-custom-hostname.easyman.app. Values are public DNS verification records, not app secrets.
- Canonical testing address: easyman.app. www.easyman.app has not been configured.
- Existing feedback secrets remain in the Sites environment; the existing linked snapshot task remains attached to the same project. No credentials are copied to DNS or source.

If the domain has a routing/sign-in problem, return to the original working address and stop testing through easyman.app while it is investigated. Keep both domain binding and DNS intact for diagnosis. If removing the alias is necessary, remove the Sites custom-domain binding and only the DNS records added for it, after confirming their recorded IDs and current values. This affects the alias, not the database. Do not remove the zone, project, storage or account keys.

For a code regression, redeploy a verified previous Sites version using the native deployment workflow. Reverting the domain or code does not undo test-data changes; use history and retained encrypted exports to recover data deliberately.

Reference: Cloudflare custom-hostname readiness requires active hostname and certificate state, plus DNS targeting the SaaS service: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/.
