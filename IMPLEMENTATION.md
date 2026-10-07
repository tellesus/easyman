# EasyMan build 0.1

This is a working owner-only pilot derived from the supplied Version 1 specification. It is not a completed production V1 or a replacement for a PMS/HRIS.

## Working today

- Responsive daily operations dashboard with sample-property setup and fresh-workspace creation.
- Shift pass-ons with categories, priorities, owner, room, due time, notes, escalation, completion, archive, and related follow-ups.
- Read-only snapshot captures at configured boundaries while a browser session is open. Schedule publication also preserves an encrypted copy.
- Selected Shift Pass-On items exported as 1920×1080 PNG briefings. Privacy mode excludes description, room, and owner fields; subjects still need human review.
- Weekly draft generation from configurable shifts, staffing requirements, qualifications, availability, desired weekly hours, preferences, and seniority tie-breaking. Overlap and 11-hour rest checks are enforced. The generator is a greedy heuristic, not a globally optimal solver or labor-law compliance engine.
- Manual shift creation/editing/removal and schedule publication with coverage review.
- XLSX schedule export for the selected week, with a weekly overview and filterable shift details, numeric scheduled-hour totals, and overnight end dates.
- XLSX room board export with an attendant workload summary and all room assignments, including unassigned/DND rooms, status, locks, and workload points. Leading-zero room numbers remain text. Files are created in the browser and exclude unrelated personnel, availability, and guest records.
- Housekeeping allocation by workload, qualification, and secondary floor continuity; fixed assignments stay locked, DND rooms are excluded, cleaning progress survives rebalancing, and manual reassignment/scoring/flags are available.
- Room inspection logging and linked rechecks.
- Separate training/coaching and discipline records with appended follow-ups, preserved original fields, and status history. Original records are intentionally not editable in this pilot.
- Employees, multiple qualified positions, availability dates, individual and all-incumbent position reporting relationships, recursive lineage derivation, and circular-path rejection.
- JSON import with copyable example, schema, and conversion prompt; reference/type validation, human-readable preview, then explicit commit. IDs upsert records without replacing the whole dataset.
- Configurable property name, time zone, shift boundaries, assignment position, categories, departments, positions, shifts, room types, and staffing rules.
- Encrypted configuration backups using AES-256-GCM and a PBKDF2-SHA-256 passphrase key with 250,000 iterations. Unencrypted configuration export requires explicit acknowledgment. Restore validates references before replacing configuration. Missing defaults merge without overwriting custom objects.
- GitHub feedback composition, review, encrypted draft preservation, and a server-side GitHub App integration that verifies a private destination repository. Uncertain submissions are blocked from blind retry to reduce duplicate issues. No GitHub credentials are shipped to browsers.

## Data and security boundary

Hosted authentication is provided by Sites / Sign in with ChatGPT. Each workspace is bound server-side to the authenticated user's stable Site ID. The entire workspace is encrypted in the browser with a random AES-256-GCM key before D1 storage. A browser-local IndexedDB vault holds the key and an encrypted copy, never an operational plaintext copy. A recovery key allows unlocking on another device; the server never receives it. This is a single-owner vault, not the full per-module, per-user key architecture described in the specification.

The remote workspace uses optimistic revision checks to prevent silent overwrites. A conflict stops writes and requires reload; the attempted version remains encrypted on the device. Network failures preserve an encrypted local copy, but there is no background retry service or offline-first merge engine. Avoid concurrent devices/tabs during the pilot. Browser-accessible keys do not protect against a compromised browser, injected script, or a user who has already copied decrypted records.

Server audit records are appended for workspace saves, configuration exports/restorations, schedule publications, and browser-triggered snapshots. There are no user-facing delete endpoints. They are application-immutable, not a cryptographic or infrastructure-admin-proof ledger. Client-reported actions do not establish independently verified data contents. Backup export is blocked if the server event cannot be recorded, except the explicitly device-local anonymous demo, which has local activity history only.

Sample access-profile selection changes sample navigation; it is not authorization. Actual data access is owner-only. There is no invitation flow, delegated authority, employee login provisioning, or scope enforcement across team users in this build. Do not share the recovery key as a substitute for team permissions.

## Remaining work before production V1

1. Multi-user property membership, user/employee association, configurable capability grants and scopes, server-side scope checks, signed-in session administration, and revocation.
2. Separate module keys, wrapped user-specific key distribution, rotation and revocation, administrator-assisted recovery, and separation of confidential records at the storage/key level.
3. Background shift snapshots at exact configured boundaries when all browsers are closed, including reliable stored revision selection, prior/incoming shift metadata, immutable server-owned snapshots, and security-event recording. Current browser captures require an open session and can miss boundaries while suspended.
4. Production GitHub App installation and server secret configuration; integration testing against the configured private repository. No live GitHub submission has been tested without credentials.
5. Full audit coverage, revision editing for personnel records, per-schedule publication state, targeted schedule regeneration, hour/rest policy configuration, richer position-specific availability and restrictions, and stronger staffing optimizer diagnostics.
6. Dedicated configuration editing/removal/disable forms, scope-aware operational exports, user/session recovery flows, CSP and platform security review, server rate limits beyond feedback, and production access/security acceptance tests.
7. Property-time-zone handling throughout date entry and scheduling arithmetic, including daylight-saving transitions. Dashboard shift labels honor the configured time zone, but some scheduling math uses the browser's local zone and the seeded daily date uses America/Chicago.
8. Cross-device recovery usability, explicit unsynced-revision recovery, browser-side malicious import resource limits, keyboard/screen-reader acceptance.

## Validation

TypeScript check and production build pass. Eleven domain checks cover schedule constraints and infeasibility, overnight rest, board locks/progress/DND/custom IDs, reporting cycles/lineage, import failures, default merges, encryption integrity, and encrypted backup passphrases. Browser QA covers pass-on creation/completion/history/reload, signed-in persistence, and responsive navigation. Anonymous workspace and audit requests return 401. Five additional workbook checks cover selected-week filtering, overnight dates, numeric totals, leading-zero rooms, DND/unassigned rooms, text safety, privacy boundaries, duplicate names, and empty exports. Browser QA exercises both export controls; ExcelJS round-trip and OOXML inspection validate the files. Direct testing in Excel, LibreOffice, and Google Sheets has not been performed.
