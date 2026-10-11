# EasyMan development notes toward 1.0

Updated October 10, 2026 (America/Chicago). EasyMan is intended for real hotel operations; current local/hosted use is development and testing with fictional data and no customers. The package, app and feedback metadata use `1.0.0`. Prior wording that treated this as a completed private release or full feature acceptance is superseded by this status record.

GitHub's releases listing returned no published releases when checked on October 10. This documentation update does not create a release/tag or change the hosting audience. [CURRENT_SPEC.md](CURRENT_SPEC.md) is the requirements source; [KNOWN_ISSUES.md](KNOWN_ISSUES.md) and [ROADMAP.md](ROADMAP.md) record unfinished work.

## October 10 — documentation alignment

- Consolidated the original seven-module scope and subsequent owner requests into the current specification. User requests are spec updates.
- Preserved reliable live use as the goal while recording the present fictional-data testing stage. Correct fixes may reset/regenerate incompatible examples without an unnecessary customer-migration project.
- Carried forward 14 open review findings. Finding 12 remains numbered but is withdrawn as required legacy compatibility work; the 12-hour stored-snapshot rule remains required for new data.
- Distinguished implemented code, known defects, original-scope completeness checks and actual verification. Removed obsolete AI-snapshot dependency instructions and premature release claims.
- Corrected in-app explanatory wording about configurable rest requirements and adding a catalog room to a dated housekeeping plan. No behavioral defect fix or data reset is included in this pass.

Validation for this alignment: local documentation links and referenced source-line bounds checked; application diff verified to contain exactly the two help-string replacements; type checks and a fresh deployment build passed. The behavioral test suite was not repeated for this documentation/help-only change.

## October 10 — snapshot and recovery development

- Added native Cloudflare scheduled execution, authenticated machine requests, overlap protection, retries/catch-up and native health receipts. This implements the requirement that snapshots continue while the browser and ChatGPT are closed.
- Added authenticated completion expiry for new pass-on records. Stored snapshots exclude items completed for at least 12 elapsed hours at the historical boundary; unresolved/recently completed items remain. Notes do not restart the clock. The old-data fallback remains an implementation detail, not required compatibility scope.
- Working-copy restoration aligns daily service plans/tasks, deduplicates room/date tasks and rejects malformed records. Normal merges preserve immutable history. Restored schedule changes and referenced template/time-zone edits return affected publication state to draft. Separate publication/reassignment defects remain open in the review.
- The latest recorded application suite at managed source `7e283d3617701c7379dc63ed47c58bb5c67fba65` passed 77 tests, type checks and the deployment build. This replaced the earlier 68-test checkpoint; it did not cover all subsequently identified workflow defects.

## Earlier implemented refinements

- Scheduling names open employee files; per-employee split-days-off consent removes the default preference for consecutive days off during generation.
- Daily housekeeping setup provides the room-catalog prompt, external approved-LLM instructions, JSON upload/paste and validation/review. Omitted rooms have No service. First setup balances points by default; same-day updates preserve attendants unless balancing is selected. DND, progress and kept assignments have distinct meanings.
- Readable daily room headers and improved balancing replaced the earlier presentation/imbalance problems; daily available-attendant selection remains missing.
- XLSX schedule and room-board exports include leading-zero identifiers, numeric values, readable manager sheets and portrait Letter handouts. The action-permission defect is still open.
- Hosted testing moved to [easyman.app](https://easyman.app/) with the existing private audience. Same-account recovery, private GitHub feedback and other workflows received synthetic/owner checks documented in the testing guides.

## Remaining work and evidence limits

The review covers availability preservation, authorized reassignment, scoped housekeeping, daily staffing, narrow permissions, schedule coverage/publication/hours, recovery approval sessions, snapshot viewing, discipline acknowledgment, workload defaults and export permissions. The specification also retains original shift-time adjustment and room-check reporting requirements that need completeness verification.

Testing is limited to this computer, available software and synthetic records/identities. Real-team, actual-device and actual-PMS/LLM validation is unavailable. Heuristics can leave unavoidable imbalance, but cannot excuse ignoring configured constraints or targets. See the roadmap for fixes and the checklist for verification. An official release decision must address the remaining behavior and evidence.
