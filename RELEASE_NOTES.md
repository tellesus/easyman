# EasyMan development notes toward 1.0

October 11 scheduling extension implements the owner's approved update: daily staffing defaults, independent saved weekly demand, explicit overnight eligibility, automatic gap-resolution dialog, deliberate Manager coverage, combined manual warnings/override reasons and adjacent-week rest checks. Manager entries and demand are encrypted, permission-checked and included in publication history/XLSX; the isolated demo uses the same workflow. Existing Manager commitments remain fixed during regeneration. See SCHEDULING_GUIDE.md and the new test-staffing/API regressions. This feature update does not create an official 1.0 release.

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
- Working-copy restoration aligns daily service plans/tasks, deduplicates room/date tasks and rejects malformed records. Normal merges preserve immutable history. Restored schedule changes and referenced template/time-zone edits return affected publication state to draft. The later corrective batches resolve the reviewed publication/reassignment defects.
- The latest recorded application suite at managed source `7e283d3617701c7379dc63ed47c58bb5c67fba65` passed 77 tests, type checks and the deployment build. This replaced the earlier 68-test checkpoint; it did not cover all subsequently identified workflow defects.

## Earlier implemented refinements

- Scheduling names open employee files; per-employee split-days-off consent removes the default preference for consecutive days off during generation.
- Daily housekeeping setup provides the room-catalog prompt, external approved-LLM instructions, JSON upload/paste and validation/review. Omitted rooms have No service. First setup balances points by default; same-day updates preserve attendants unless balancing is selected. DND, progress and kept assignments have distinct meanings.
- Readable daily room headers and improved balancing replaced the earlier presentation/imbalance problems; daily available-attendant selection is now implemented as a saved Working today roster.
- XLSX schedule and room-board exports include leading-zero identifiers, numeric values, readable manager sheets and portrait Letter handouts. The action-permission defect is still open.
- Hosted testing moved to [easyman.app](https://easyman.app/) with the existing private audience. Same-account recovery, private GitHub feedback and other workflows received synthetic/owner checks documented in the testing guides.

## Remaining work and evidence limits

The review covers availability preservation, authorized reassignment, scoped housekeeping, daily staffing, narrow permissions, schedule coverage/publication/hours, recovery approval sessions, snapshot viewing, discipline acknowledgment, workload defaults and export permissions. The specification also retains original shift-time adjustment and room-check reporting requirements that need completeness verification.

Testing is limited to this computer, available software and synthetic records/identities. Real-team, actual-device and actual-PMS/LLM validation is unavailable. Heuristics can leave unavoidable imbalance, but cannot excuse ignoring configured constraints or targets. See the roadmap for fixes and the checklist for verification. An official release decision must address the remaining behavior and evidence.

## First fix batch — employee edits, scheduling authority and recovery

- Fixed review IDs **1, 2, 5, 7 and 8**: preserve richer availability/reporting IDs; authorize shift reassignment in both scopes; allow editor-only safe publication downgrades; draft source/destination weeks after a move; reject revoked administrator sessions for recovery listing/approval.
- Added readable controls for additional availability restrictions, with date, weekday, shift, position and reason inputs.
- Added authenticated publication-week metadata (AAD version 3) and migration **0008_publication_permissions**. Publish permission is still required to add weeks; contradictory encrypted payloads cannot promote a draft.
- Verification: **84 automated tests passed**, type checks and build passed; local save/reload verified preservation and structured range edits. No hosted example-data reset. At that batch, nine other findings and completeness checks were pending; the final batch below completes them. This was not a release sign-off.

## Second corrective batch — housekeeping (October 10, 2026)

- Fixed dated service for scoped attendants without exposing the full daily plan (3).
- Added a saved Working today roster per day, optional authorized schedule suggestions, empty-roster behavior, and explicit release warnings when removing attendants with assignments/locks (4). Progress, holds and overrides remain.
- Add room now uses room-type workload defaults with explicit override/reset controls (14).
- Verification: **90 tests passed**, type checks/build and local roster/import/room-form save/reload checks passed. At that batch, six findings plus C1/C2 remained; the final batch below completes them. This was not release sign-off.

Also corrected a save-status race discovered during these checks: Saving securely appears as soon as work is queued, an older save cannot clear newer pending edits, and leaving with pending saves triggers the browser’s warning handler. Browser save/reload and the generation-order test passed.

## Final corrective batch — October 10, 2026

- Count protected assignments as fixed coverage during full/partial generation (6).
- Allocate against desired weekly hours and show coverage/preferences/hour/constraint quality notes (9).
- Require deliberate hour/rest override acknowledgment and a recorded reason; preserve hard eligibility/overlap/authority checks (10).
- Support per-assignment start/end/hour adjustments across constraints, desktop/mobile display, frozen publication history and XLSX (C1).
- Show complete frozen pass-on details and notes/history in the read-only snapshot viewer (11).
- Preserve discipline acknowledgment on unrelated edits and keep the previous revision (13).
- Enforce actual capability/module-view/employee scope for operational exports (15).
- Record inspection attendant/category/date and support all original history filters with linked separate rechecks (C2).

The complete suite passes **99/99 tests**, TypeScript checks and the deployment build. New focused cases cover protected full/partial coverage, feasible 8/40-hour allocation, hour/rest override acknowledgment, custom-time constraints/XLSX, real capability/scope exports, inspection details/rechecks/all filters, acknowledgment revisions and frozen snapshot rendering. An actual encrypted storage/readback test preserves custom schedule fields, inspection attendant/category, acknowledgment/history and captured owner/note details. Local browser checks saved/reloaded custom times with a deliberate weekly-limit override, separate inspection/recheck/filter history and an unrelated discipline edit retaining Acknowledged. Tests use fictional records and isolated identities; no hosted examples were reset.

No original review fixes remain open. Package metadata remains 1.0.0 for the development candidate; publishing this correction does not create an official 1.0 release or change access.

## Public product introduction and AGPL license

Added a responsive public landing page with interactive fictional feature illustrations, workflow/scope explanations, FAQs, explicit development/demo status and source links. The authenticated workspace moves to `/app`, including invitation/sign-in return routes and legacy forwards. Added license/source/no-warranty notices, robots and sitemap. Original EasyMan code/documentation is AGPL-3.0-only, as selected by the owner. Database, keys, private feedback and native snapshot infrastructure are unchanged. This publishes the brochure; it does not declare official 1.0 or launch a public operational demo.

## Isolated interactive demo

Added the public demo on demo.easyman.app with shared workflows and temporary fictional state. Edits, schedule generation/publication, housekeeping, inspections, personnel logs and pass-ons work locally; reset/refresh starts over. Added an always-visible banner, three suggested activities, sample PMS/JSON downloads and mapping review. Account/recovery/session actions are unavailable; feedback is preview-only and snapshots are labeled examples. Actual XLSX exports remain available. The static build excludes live storage/account/server modules and blocks browser connections. Its ExcelJS build uses default deprecation-warning settings without browser-storage preference lookups; the real app dependency is unchanged. Original crypto helpers are separated from IndexedDB while the normal app retains the same public functions and storage behavior. Full suite: 107 passing tests; TypeScript passes. Website links now offer Try the demo and Sign in separately.
