# EasyMan roadmap to live use

Updated October 10, 2026. The goal is a reliable hotel operations application for real daily use. Today all workspaces contain test/example records and there are no customers. [CURRENT_SPEC.md](CURRENT_SPEC.md) defines the requirements; owner changes update that specification. This roadmap does not authorize additional product scope.

## 1. Align the working documents

This documentation pass establishes one current specification, distinguishes implementation from verification, replaces obsolete AI-scheduler instructions, corrects premature release claims and carries the review findings into [KNOWN_ISSUES.md](KNOWN_ISSUES.md). It does not implement those fixes or reset data.

Finding 12 is withdrawn as a legacy-data compatibility requirement. Incompatible fictional records/history may be replaced with fresh examples. The required 12-hour rule still applies correctly to new pass-ons and stored snapshots. This does not reduce live-use functionality, ordinary history preservation, security or recovery requirements.

## 2. Fix the known workflow and access defects

The following is the proposed implementation order within the agreed scope. Issue numbers remain stable so earlier discussion can be followed. First batch completed and locally verified: **1, 2, 5, 7, 8**. Second batch completed and locally verified: **3, 4, 14**. Final batch completed and locally verified: **6, 9, 10, 11, 13, 15**, plus **C1/C2**. No original review fixes remain open.

| Work group | Review IDs | Required outcome |
| --- | --- | --- |
| Preserve work and enforce authority — fixed, locally verified | 1, 2, 5, 8 | Employee edits preserve availability/reporting; authorized shift reassignment and narrow edits persist; revoked admin sessions cannot approve recovery. |
| Make daily housekeeping actionable — fixed, locally verified | 3, 4, 14 | Scoped staff see correct service; managers select the available daily pool; room-type defaults initialize scores. |
| Make schedule results and publication reliable — fixed, locally verified | 6, 7, 9, 10 | Fixed coverage is counted; both weeks become draft after moves; desired hours influence allocation; manual maximum-hour violations require a deliberate warning/override path. |
| Finish historical views and action controls — fixed, locally verified | 11, 13, 15 | Frozen pass-on details are usable; unrelated discipline edits retain acknowledgment; exports use real capability/scope checks. |

For each correction, reproduce the issue with synthetic data, fix the actual workflow, add a focused regression where useful, and record the check result. Use fresh generated examples if a correct schema/data standard makes existing examples incompatible. Do not spend time preserving old dummy data for its own sake.

Daily attendance is an explicit saved roster with optional authorized schedule suggestions. Manual hour/rest overrides now require a warning acknowledgment and recorded reason; the snapshot viewer exposes complete frozen operational details. The behavior above is required; the review's example solutions are not extra approved features.

Completed the original-scope coverage checks **C1** (individual shift-time adjustment) and **C2** (room-check attendant/category details and history filters), recorded in the issue register. Individual assignment times and inspection detail/history filters are implemented and locally verified. These completed original-scope checks were not new product scope.

## 3. Verify the candidate on this computer

- Re-run the affected workflows and the relevant automated checks after fixes. Validate the complete candidate with tests, type checks and the deployment build.
- Exercise actual narrow permissions with isolated synthetic identities; a visual access-profile preview does not prove authorization. Keep simulated identity tests distinct from real hosted identity-provider/account tests.
- Verify a genuine native scheduled snapshot and its frozen boundary contents with synthetic data. A successful no-work receipt demonstrates execution, while boundary content requires its own check.
- Check recovery, reload, failed-save retry, conflict handling and operational exports using the available browsers/spreadsheet software. Update the detailed [checklist](TESTING_CHECKLIST.md) with evidence tied to the tested revision.
- Keep real-team, actual-device and actual-PMS validation visibly untested where unavailable. Record what those limits mean for the release decision; do not invent a requirement to obtain a team before continuing development.

## 4. Make the release decision explicitly

Review the agreed V1 scope, resolved/unresolved issue list and current verification results together. Resolve defects that prevent intended workflows; discuss any remaining limitations explicitly rather than silently redefining the product or treating package numbering as approval.

When the owner proceeds with release, record the exact source/version, release notes, operation/recovery instructions and checks. Preserve the intended hosting audience unless a change is requested. Publication of a build and opening access to real users are separate decisions. Future real data would call for a data-preservation plan appropriate to that stage; there is no such customer migration obligation today.

## Boundaries of this roadmap

No embedded AI, direct PMS connector, customer migration project, notification system or additional modules are added by this plan. The old AI snapshot automation is user-managed cleanup, not a product runtime dependency or an ongoing development task. Broader feature ideas remain outside V1 unless the owner updates the specification.

## Completed review-fix handoff (before website update)

The complete suite passes **99/99 tests**, TypeScript checks and the deployment build. New focused cases cover protected full/partial coverage, feasible 8/40-hour allocation, hour/rest override acknowledgment, custom-time constraints/XLSX, real capability/scope exports, inspection details/rechecks/all filters, acknowledgment revisions and frozen snapshot rendering. An actual encrypted storage/readback test preserves custom schedule fields, inspection attendant/category, acknowledgment/history and captured owner/note details. Local browser checks saved/reloaded custom times with a deliberate weekly-limit override, separate inspection/recheck/filter history and an unrelated discipline edit retaining Acknowledged. Tests use fictional records and isolated identities; no hosted examples were reset.

The reviewed corrective work is complete. The later owner-approved website/demo update below defines the next presentation work; an explicit 1.0 release decision remains separate. Continue development only for a newly identified defect or an owner-approved spec update; do not silently add customer migration work or an external testing team requirement.

## Owner-requested public website update

Build/publish a professional public brochure at the existing domain; move the authenticated workspace entry to `/app` without changing operational data or infrastructure. License original EasyMan material under AGPL-3.0-only as selected by the owner. See [WEBSITE.md](WEBSITE.md). The owner approved and implemented the separate isolated playable demo described in DEMO.md. Public introduction is distinct from declaring a live customer service or tagging 1.0.

## Public demo completed

The owner-approved demo runs on its own origin and static Site. Memory-only edits, reset/refresh, guided starting activities, fictional PMS files, illustrative snapshots and real exports are implemented. The website links to it separately from registered-user sign-in. The signed-in app retains its storage, account, recovery, feedback and native-snapshot features. Validation and maintenance are in DEMO.md. This does not announce official 1.0 or customer availability.
