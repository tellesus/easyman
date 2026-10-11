# EasyMan roadmap to live use

Updated October 10, 2026. The goal is a reliable hotel operations application for real daily use. Today all workspaces contain test/example records and there are no customers. [CURRENT_SPEC.md](CURRENT_SPEC.md) defines the requirements; owner changes update that specification. This roadmap does not authorize additional product scope.

## 1. Align the working documents

This documentation pass establishes one current specification, distinguishes implementation from verification, replaces obsolete AI-scheduler instructions, corrects premature release claims and carries the review findings into [KNOWN_ISSUES.md](KNOWN_ISSUES.md). It does not implement those fixes or reset data.

Finding 12 is withdrawn as a legacy-data compatibility requirement. Incompatible fictional records/history may be replaced with fresh examples. The required 12-hour rule still applies correctly to new pass-ons and stored snapshots. This does not reduce live-use functionality, ordinary history preservation, security or recovery requirements.

## 2. Fix the known workflow and access defects

The following is the proposed implementation order within the agreed scope. Issue numbers remain stable so earlier discussion can be followed. All listed fixes are still pending at this documentation revision.

| Work group | Review IDs | Required outcome |
| --- | --- | --- |
| Preserve work and enforce authority | 1, 2, 5, 8 | Employee edits preserve availability/reporting; authorized shift reassignment and narrow edits persist; revoked admin sessions cannot approve recovery. |
| Make daily housekeeping actionable | 3, 4, 14 | Scoped staff see correct service; managers select the available daily pool; room-type defaults initialize scores. |
| Make schedule results and publication reliable | 6, 7, 9, 10 | Fixed coverage is counted; both weeks become draft after moves; desired hours influence allocation; manual maximum-hour violations require a deliberate warning/override path. |
| Finish historical views and action controls | 11, 13, 15 | Frozen pass-on details are usable; unrelated discipline edits retain acknowledgment; exports use real capability/scope checks. |

For each correction, reproduce the issue with synthetic data, fix the actual workflow, add a focused regression where useful, and record the check result. Use fresh generated examples if a correct schema/data standard makes existing examples incompatible. Do not spend time preserving old dummy data for its own sake.

Some interaction details remain implementation decisions: how to select/add/remove available attendants and optionally derive suggestions from scheduling; how to present intentional hour-limit warning overrides; and how best to show complete frozen pass-on details. The behavior above is required; the review's example solutions are not extra approved features.

Also verify/complete the original-scope coverage checks **C1** (individual shift-time adjustment) and **C2** (room-check attendant/category details and history filters), recorded in the issue register. Current controls do not demonstrate the full original requirements. These are completeness checks alongside the corresponding module fixes, not newly requested product scope.

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
