# EasyMan 1.0.0

Private release — October 10, 2026 (America/Chicago).

EasyMan brings shift handovers, scheduling, daily housekeeping and employee follow-up into a configurable hotel operations workspace at https://easyman.app/.

## Included

- Shift pass-ons with ownership, notes, escalation, completion, archive, privacy-conscious briefing images and preserved shift-boundary snapshots. The existing hourly background task remains connected.
- Schedule generation with qualifications, availability, rest and hour constraints, partial regeneration, consecutive-days-off preferences and per-employee split-day consent. Employee names open their profiles. Published history preserves original assignments and shift times.
- Daily housekeeping setup using a copyable room-catalog prompt for the hotel's approved LLM, followed by JSON upload/paste and explicit validation/review. First-time day setup balances workload points by default; same-day updates preserve attendants unless balancing is selected. Kept assignments, cleaning progress, DND holds and dated boards are retained.
- Schedule XLSX exports and room-board XLSX exports with readable manager tables and portrait Letter attendant handouts. Room identifiers preserve leading zeros. No-service and DND rooms stay off attendant handouts.
- Room inspection/recheck history, coaching and discipline revisions, configurable departments/positions/shifts/rooms, validated setup imports, encrypted working copies and account recovery files.
- Capability/scoped record access, encrypted record keys, session revocation, stale-write protection and a separate private GitHub feedback destination.

## Release fixes

- Backup restoration now restores each day's service plan with its tasks, deduplicates tasks by room/date and preserves cleaning progress and kept assignments. Newer unrelated records remain; existing immutable snapshots are retained. Malformed daily records are rejected before merging.
- Restoring changed live schedules, editing referenced shift templates, or changing the property time zone returns affected published weeks to draft. Published copies retain their original contents and shift times.
- The app, feedback issue metadata, MCP server and package metadata share version 1.0.0.

## Validation and release scope

The release candidate passes 68 automated checks, TypeScript checks and the production build locally. Checks include actual storage handlers with isolated synthetic identities, encrypted restoration into an empty property, task preservation, published-history integrity and release-version consistency. Browser checks on this computer verified empty-property setup/reload, encrypted working-copy preview/restore/reload, housekeeping state after restoration and publication history after a shift-template edit. GitHub checks must also pass for the tagged commit.

Michael previously reported 12 passing live-domain checks, including same-account recovery, scheduled snapshots with the app closed, feedback, records/history and network interruption. Subsequent assistant checks covered the revised housekeeping workflow and workload balance. Owner-reported and assistant-run evidence are recorded separately in TESTING_CHECKLIST.md and LIVE_TESTING.md.

The hosted app remains restricted to the existing allowed account. This GitHub source release does not make the Site public or grant property access. No production hotel records or account keys are included in the repository or release assets.

## Deferred validation

- Real-team invitations, different-user permissions and recovery by a genuinely different administrator.
- Actual phone/tablet hardware and real operational acceptance by hotel staff.
- Actual PMS exports and outputs from a hotel's approved external LLM. The current walkthrough uses fictional reports and a hand-prepared conversion result; EasyMan does not call an LLM or connect directly to a PMS.
- Spreadsheet applications unavailable on this computer. LibreOffice print output was checked; the owner checked the applications available to them.

Scheduling and housekeeping use heuristics and do not promise a globally optimal solution. Kept assignments and indivisible room scores can prevent equal workloads. There are no push/email/SMS notifications. Shift snapshots preserve pass-ons; they are not a full property backup.

See RECOVERY_AND_ROLLBACK.md for recovery files, working-copy restoration and deployment rollback.
