# EasyMan testing checklist — one computer

EasyMan is being built for reliable use by real hotel managers and teams. It is currently in development with fictional data and no customers. Test the intended product in [CURRENT_SPEC.md](CURRENT_SPEC.md); current defects are recorded in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

These boxes are a fresh run template. Earlier owner and assistant results remain in [LIVE_TESTING.md](LIVE_TESTING.md), with their dates and limits. A passed check is evidence for its recorded scenario/build, not certification of an entire feature. Keep known failures open until their fixes are verified.

**Source/build:** __________ **Browser/app version:** __________ **Date and property time zone:** __________

**Results:** Pass ___ / Fail ___ / Deferred ___

## 1. Prepare the test workspace

- [ ] **P01 — Baseline:** Confirm the intended example property and “Encrypted · saved,” then reload. Expect the same rooms, employees, progress and records.
- [ ] **P02 — Backup and recovery features:** Export an encrypted configuration backup, encrypted working copy, and account recovery file. Expect three usable downloads with distinct purposes. Keep passphrases outside the files.
- [ ] **P03 — Test labels and resets:** Use `TEST —` subjects and invented names. Record settings needed to reproduce a result. If a fix makes examples incompatible, reset and regenerate affected example data using a deliberate, verified procedure. Preserving obsolete dummy data is not a release requirement. Resetting test data does not mean deleting hosting, DNS, repositories or secrets. No reset is part of this documentation update.

## 2. Settings, employees and imports

- [ ] **C01 — Settings:** Change the example property name, save/reload, then restore it. Expect both changes to persist.
- [ ] **C02 — Time zone:** Check the IANA time zone and shift-change times. Expect scheduling, incident times and snapshots to use the property zone. Do not change the computer clock to simulate application time.
- [ ] **C03 — Configuration:** Add unused departments, positions, shifts and room types; edit, disable and remove supported items. Expect a clear refusal when removing a referenced item would make the current workspace inconsistent.
- [ ] **C04 — Employee:** Add an invented employee with affiliations, positions, qualifications, seniority, desired hours and a maximum-hour limit. Edit/reload; expect unrelated values to remain.
- [ ] **C05 — Reporting:** Add position-based and individual reporting links. Try a circular relationship. Expect valid links to save and circles to be rejected without changing the saved graph.
- [ ] **C06 — Import preview:** Preview a small valid employee/room import and cancel; expect no change. Preview again and confirm; expect exactly the reviewed records.
- [ ] **C07 — Invalid imports:** Try duplicate IDs, unknown departments/types, impossible dates and unexpected fields. Expect useful errors and no partial import.
- [ ] **C08 — Availability preservation (issue 1):** Import date-range and shift/position-specific restrictions. Edit only a name, then only split-days-off consent. Save/reload each time. Expect every restriction and qualifier to remain. Fixed in the first batch; domain and local browser preservation checks passed.
- [ ] **C09 — Room-type defaults (issue 14):** Configure different type defaults and add a room of each type. Expect the type to initialize a new room's score, with explicit room/day overrides independent. Fixed in the second batch; local defaults/override/reset/save/reload checks passed.

## 3. Scheduling and its spreadsheet

- [ ] **S01 — Generate:** Use fictional staffing rules. Expect active, qualified employees, no overlaps, and respected rest and maximum-hour limits.
- [ ] **S02 — Availability:** Test unavailable weekdays, date ranges and shift-specific restrictions, including an overnight shift ending on an unavailable day. Expect no hard-restriction violation.
- [ ] **S03 — Infeasible staffing:** Request more qualified people than are available. Expect uncovered staffing to be reported instead of violating hard restrictions.
- [ ] **S04 — Manual edits (issues 2 and 10):** Add, change, reassign and remove assignments; save/reload each time. Expect authorized reassignment to persist and maximum hours not to be silently bypassed. Reassignment is corrected and API-tested; hour/rest warnings now require acknowledgment and a saved reason, verified in the final batch.
- [ ] **S05 — Partial regeneration:** Regenerate selected dates. Expect untouched dates to remain identical and still constrain overlap, rest and weekly hours.
- [ ] **S06 — Publication and history (issue 7):** Publish, then edit assignments or shift templates. Expect original publication history to remain. Move an assignment between weeks; both affected current weeks must reflect changed draft status after reload. Cross-week reassignment/invalidation now passes its focused regression; retain this checklist for further end-to-end checks.
- [ ] **S07 — Schedule XLSX:** Export a selected week. Expect correct dates and draft/publication labels, separate employees with matching names, numeric totals and correct overnight end dates.
- [ ] **S08 — Employee file:** Click an employee name in desktop and narrow-screen Scheduling. Expect the matching file and access to Edit employee.
- [ ] **S09 — Days-off consent:** Save/reload with “OK with split days off” unchecked, then checked. Expect the preference to persist without altering existing assignments or richer availability rules.
- [ ] **S10 — Days-off generation:** With feasible staffing, prefer consecutive days off for employees without consent. For consenting employees, the together-days preference must not influence selection. Hard restrictions take priority; repeat partial generation to confirm untouched dates stay fixed.
- [ ] **S11 — Desired hours (issue 9):** Use feasible 8-hour and 40-hour targets. Expect targets to influence allocation and useful shortfall information when they cannot be met. The reviewed generator balanced raw hours instead and hid its under-hours messages.
- [ ] **S12 — Protected coverage (issue 6):** In an isolated synthetic scoped-user test, retain an assignment the editor cannot modify on a regenerated date. Expect it to count toward staffing, remain unchanged and not be filled twice. This currently fails.
- [ ] **S13 — Shift-time adjustment (coverage C1):** Verify an authorized user can adjust the intended assignment's times, with overlap/rest/availability checks and consistent publication/export results. Per-assignment start/end/hour controls are implemented and verified in constraints, save/reload, frozen history and XLSX; selecting a template is a separate action.

## 4. Rooms, housekeeping and its spreadsheet

- [ ] **H01 — Room catalog:** Add room `007`; edit its type, floor/zone and fractional workload points. Expect leading zeros and numeric points to persist.
- [ ] **H02 — Balance:** Prepare a new day with uneven scores and balancing enabled (the new-day default). Expect requested departures/stayovers to be assigned, workload balanced subject to indivisible room scores and kept assignments, and DND/no-service rooms outside active work.
- [ ] **H03 — Kept assignments and progress:** Select **Keep with this attendant** for one assignment, mark another room clean, and rebalance. Expect both to remain. This keeps an assignment with a person during balancing; it does not mean the room is physically locked.
- [ ] **H04 — Overrides and reassignment:** Apply a temporary score/flag override and reassign a room. Expect totals and exports to reflect it without silently rewriting the room catalog.
- [ ] **H05 — DND:** Hold a room as DND, including one kept with an attendant, and rebalance. Expect a visible hold outside active work. Clear DND and confirm service can resume.
- [ ] **H06 — Board XLSX and handouts:** Expect a manager summary/overview and a named tab for each attendant with work. Preserve `007`, numeric fractional totals and dated progress. Represent unassigned/DND/no-service rooms appropriately in the overview. Omit internal attendant IDs and assignment-lock fields. Print a handout: portrait Letter, readable room/type/floor spacing, floor/zone ordering, Done column and note space. Exclude DND/inactive work. Long lists should continue on another portrait page rather than shrink to unreadable text.
- [ ] **H07 — Daily setup:** Follow [the fictional PMS walkthrough](examples/housekeeping/README.md). Copy the prompt with the current catalog/date; test JSON paste and upload. Unknown rooms/conflicts must block applying until explicitly resolved. Inspect the complete no-service list.
- [ ] **H08 — Import errors:** Test malformed JSON, wrong dates, numeric room identifiers, duplicate/conflicting services and guest fields. Expect useful errors and an unchanged board. An all-no-service plan requires confirmation.
- [ ] **H09 — Same-day updates:** Apply the plan twice with balancing off (the update default), then opt into balancing. Expect no duplicates or reset progress, kept assignments or DND holds. Remove a clean room after reviewing the warning, then restore its service; expect saved progress to return.
- [ ] **H10 — New day/history:** Prepare another day with fresh progress, assignments and holds. Revisit a prior date and reload; expect its board to remain and past dates to be read-only. Export the selected date; verify filename/workbook dates.
- [ ] **H11 — Daily attendant pool (issue 4):** Select Working today and exclude an off-duty attendant. Expect setup/rebalancing and new manual assignments to use that saved pool after reload. Remove an attendant with kept/clean rooms, review the release warning, and verify progress remains while locks are released. Test an empty roster and a new date; tasks must remain unassigned. Use optional schedule suggestions with authorized schedule/availability access; unavailable shifts must be excluded. Fixed in the second batch with local browser and encrypted/API checks.
- [ ] **H12 — Scoped instructions (issue 3):** Read an assigned stayover as a synthetic scoped user without the full daily plan. Expect it to stay a stayover after reload. The current view can incorrectly show a departure.
- [ ] **H13 — Table readability:** Check Room, Floor/Zone, Service, Attendant and Progress headings, concise values without repeated “Room”/“Floor” prefixes, and narrow-screen readability.

## 5. Inspections, coaching and discipline

- [ ] **R01 — Inspections:** Record an initial result and separate recheck. Expect both in history.
- [ ] **R02 — Inspection boundaries:** Expect failures to remain inspection records, with no automatic disciplinary decision.
- [ ] **R03 — Coaching:** Create an invented record, expected improvement and follow-up, then edit it. Expect current content, revisions and append-only follow-up after reload.
- [ ] **R04 — Discipline:** Create/edit an invented record and add follow-up. Expect its incident/employee association and prior content to remain preserved.
- [ ] **R05 — Acknowledgment (issue 13):** Set Acknowledged, edit unrelated text and reload; repeat with Declined. Expect the saved acknowledgment unless explicitly changed. The current form can reset it to Pending.
- [ ] **R07 — Inspection details and review (coverage C2):** Verify the relevant attendant and optional failure category can be recorded, then review history by room, inspector, attendant, category, result and date range. Preserve separate rechecks. The full original fields/filters and linked recheck workflow are implemented and verified in the final batch.

## 6. Pass-ons and application-owned snapshots

- [ ] **L01 — Lifecycle:** Create `TEST — handover` with category, priority, owner, room, due time and description. Add notes, escalation and follow-up. Expect persistence and appropriate filters.
- [ ] **L02 — Completion:** Complete it. Expect removal from the open board and retention in Archive/history.
- [ ] **L03 — Briefing:** Export a privacy-conscious PNG. Expect readable 16:9 output without coaching/discipline content or details excluded by privacy mode.
- [ ] **L04 — Native health:** Inspect a recent **Last automatic check**. Refresh is read-only. A native zero-capture receipt proves a timer check, not a captured boundary. AI-task/manual/browser receipts do not satisfy this check.
- [ ] **L05 — Closed-browser handover:** Save a unique open item before a configured boundary; close the tab. After the next native check, reopen and verify the exact-boundary capture and later automatic receipt. Checks run every minute and can be delayed. Repeat on the native architecture; the October 9 owner check used its predecessor.
- [ ] **L06 — Historical freeze and useful detail (issue 11):** Edit/complete an item and add another after the boundary. Expect only frozen boundary-time records/values, including notes/history, owner, priority, room, due/follow-up time and escalation. The current viewer omits several stored details.
- [ ] **L07 — No duplicates:** Reopen/refresh repeatedly. Expect one capture per property/boundary. Use isolated tests for repeated requests, overlap and bounded batches.
- [ ] **L08 — Catch-up:** Leave the app closed across boundaries or use an isolated delayed-run test. Expect historical reconstruction and later checks continuing bounded batches. The native job currently handles up to 16 boundaries per property per tick; browser activity must not be required.
- [ ] **L09 — Completed-item cutoff:** At a boundary, include unresolved items and items completed less than 12 elapsed hours earlier. Exclude items completed exactly 12 hours earlier or longer. Later notes do not restart the clock; reopening restores unresolved eligibility. Later edits must not change earlier snapshots. Use new-format examples and isolated clock-controlled cases. Incompatible old examples/history may be reset; legacy backfill is not an acceptance requirement.

## 7. Files, recovery, feedback and concurrent editing

- [ ] **B01 — Backup privacy:** Inspect encrypted files as text. Expect ciphertext rather than readable operational descriptions; store passphrases separately.
- [ ] **B02 — Restore:** Preview/cancel a working copy; expect no change. Try a wrong passphrase; expect rejection without corruption. Confirm a valid restore in an isolated example workspace and verify previewed values after reload.
- [ ] **B03 — Same-account recovery:** In another browser profile, sign in with the same account and restore its recovery file. Expect authorized records after reload. Keep the working browser available during the recovery test so failures can be investigated.
- [ ] **R06 — Recovery form errors:** Missing, empty, malformed, wrong-format/wrong-account files and wrong passphrases must show useful errors without replacing a stored key. Restore requires the necessary inputs.
- [ ] **B04 — Concurrent saves:** Save in one of two windows, then attempt a stale edit in the other. Expect conflict/reload handling rather than silent overwrite. One account in two windows does not prove different-user permissions.
- [ ] **B05 — Feedback:** Save/reload an invented draft, review and submit once. Verify the private issue and Pain Point, Bug or Feature Request category. Failure must retain the encrypted draft. Close synthetic issues after verification.
- [ ] **B06 — Connection interruption:** Disconnect briefly during a harmless edit, then reconnect. Expect an honest failure/retry state and preserved local work; verify the eventual saved result after reload.

## 8. Access checks with isolated synthetic users

These checks can run on this computer using actual handlers and fictional identities. They do not require a live team. The sample access-profile preview is a navigation preview, not access-enforcement evidence.

- [ ] **A01 — Editing permissions (issue 5):** Scheduling.Edit plus Availability.View should permit draft edits of a published week without Scheduling.Publish. Employee managers should be able to change names without Property.Configure or unrelated reporting rewrites. Both reproduced combinations are corrected and pass the focused helper/client/API checks.
- [ ] **A02 — Revoked recovery approval (issue 8):** Revoke a synthetic administrator's app session. Expect privileged recovery approval to reject it while the intended bootstrap flow remains usable. The approval-session gap is corrected and verified with actual handlers and synthetic identities.
- [ ] **A03 — Export capability (issue 15):** With view access but no OperationalData.Export, expect export actions to follow the actual account's capability/scope. Current controls use a sample preview role instead.
- [ ] **A04 — Scope boundaries:** Exercise confidential records, grants, reporting scopes, disabled users and stale writes through actual handlers and encrypted recipients. Hidden navigation alone does not establish a pass.

## 9. Layout and spreadsheet applications

- [ ] **U01 — Narrow browser:** Check navigation, forms, modals, tables/cards and exports at a phone-like width. Expect readable, usable controls. This does not certify actual mobile hardware.
- [ ] **U02 — Keyboard:** Tab/Shift+Tab through forms/modals and close with Escape. Expect visible focus and appropriate modal focus containment.
- [ ] **U03 — Spreadsheet compatibility:** Open both exports in every available target: Excel [ ], LibreOffice Calc [ ], Google Sheets [ ]. Mark unavailable apps Deferred. Check values, dates, totals and room-number formatting; save/reopen a copy. Use synthetic exports for cloud uploads.
- [ ] **U04 — Literal text:** Export an invented value beginning with `=`. Expect literal text, not an executed formula.

## Evidence and open regressions

The historical review-baseline automated result was **77 passing tests, passing TypeScript checks and a successful build**, at source `7e283d3617701c7379dc63ed47c58bb5c67fba65` on October 10, 2026. The initial documentation-only alignment did not rerun that suite; the subsequent first fix batch passes 84 tests as recorded below. Its individual checks remain useful; the later review found workflow failures outside their coverage. See [LIVE_TESTING.md](LIVE_TESTING.md) for dated local-browser, LibreOffice, recovery and native-timer observations.

Review issue 12 concerned incompatible legacy snapshot history. The owner permits replacement of incompatible examples, so historical backfill is not a blocker. New-format snapshot behavior still must pass L09. Issues 1, 2, 5, 7 and 8 are fixed and locally verified by the first implementation batch. The second batch fixes 3, 4 and 14. Those findings and C1/C2 are now completed in the final batch below.

## Evidence deferred by available equipment/accounts

- [ ] **D01 — Hosted invitation/approval with another real account:** Private Site access and property membership both need verification when another account is available.
- [ ] **D02 — Different-administrator recovery/key provisioning:** Synthetic checks can proceed now; hosted end-to-end verification needs another administrator account.
- [ ] **D03 — Actual phones/tablets:** Narrow desktop windows are the currently available approximation.
- [ ] **D04 — Actual PMS/approved LLM conversion:** The included conversion fixture is hand-prepared; real report/model combinations remain untested.
- [ ] **D05 — Hotel staff workflow feedback:** There is no live property or test team today. Record the evidence gap honestly and revisit release implications explicitly.

These limitations do not reduce product scope. They are not proof of failure or completion and must not silently introduce new feature requirements.

## Record results

Record check ID, source/build, steps, expected/observed behavior, browser/app version, time zone and evidence using invented data. Re-test affected scenarios after fixes. Deferred does not mean passed.

| Check ID | Result and evidence | Fix and re-test |
| --- | --- | --- |
| | | |
| | | |
| | | |

## First fix batch — verification record

**84/84 automated tests, type checks and deployment build passed.** New checks cover rich availability/reporting preservation, narrow name editing, advanced-rule validation, cross-week reassignment/history, both reassignment scopes, editor-only publication downgrade and tamper/escalation denial, and recovery approval session revocation/bootstrap. Local browser checks saved/reloaded a qualified date range, changed only name/consent, and edited the range end using normal controls. The fresh-run boxes remain a reusable manual checklist; these results do not turn unavailable hosted/team/device checks into passes.

## Second fix batch verification — October 10, 2026

**90/90 automated tests, type checks and deployment build passed.** At the second batch, six new focused tests covered empty daily rosters, removal/progress/locks/date isolation, optional schedule suggestions, actual encrypted scoped service, independent score defaults/overrides, and stale queued-save completion. Actual storage and backup/recovery fixtures also verify encrypted roster readback. Existing balancing/export fixtures now explicitly select their synthetic attendants. Local browser import produced 3 departures/3 stayovers, balanced 3/3/2.25 points across selected attendants; removing one attendant released a kept clean room after an explicit warning, then rebalance/reload preserved cleaning progress and the reduced roster. Add room verified suite 2, queen 1.25, retained an override of 2.5 on type change, reset to the type default and saved/reloaded a fictional room. These are local synthetic checks; no real team or PMS report was available.

## Final corrective batch — October 10, 2026

The complete suite passes **99/99 tests**, TypeScript checks and the deployment build. New focused cases cover protected full/partial coverage, feasible 8/40-hour allocation, hour/rest override acknowledgment, custom-time constraints/XLSX, real capability/scope exports, inspection details/rechecks/all filters, acknowledgment revisions and frozen snapshot rendering. An actual encrypted storage/readback test preserves custom schedule fields, inspection attendant/category, acknowledgment/history and captured owner/note details. Local browser checks saved/reloaded custom times with a deliberate weekly-limit override, separate inspection/recheck/filter history and an unrelated discipline edit retaining Acknowledged. Tests use fictional records and isolated identities; no hosted examples were reset.

The browser rejected a 40.5-hour manual save without override acknowledgment, then retained adjusted 08:00–17:00/8.5-hour values and the reason after save/reload. An original synthetic Fail/Bathroom inspection and passing recheck remained separate after reload; room/attendant filters and original-history expansion were exercised. An acknowledged synthetic discipline record retained Acknowledged and its prior revision after a subject-only edit and reload. Snapshot detail rendering is covered by the actual read-only component test and encrypted storage; scoped exports are checked with synthetic capability/scopes, not a visual preview role.

All original review fixes and C1/C2 are complete. The unchecked reusable checklist boxes still represent a fresh acceptance run, not missing implementation. Unavailable real-team/device/PMS checks remain explicitly unverified; no requirement to obtain such a team was invented.

## Public website acceptance

- [ ] Open `/` without sign-in; check that only public product information and labeled fictional illustrations appear.
- [ ] Switch all three feature previews with mouse and arrow keys; open/close FAQs; check anchor links and narrow layouts.
- [ ] Open `/app` while signed out; expect sign-in before a workspace renders. Anonymous operational API requests must return 401 with no records.
- [ ] Sign in with the existing owner and open `/app`; confirm the same property and account keys still work.
- [ ] Follow a property/invitation link; confirm the reference survives navigation/sign-in.
- [ ] Check footer and Account options license/source notices. The separate playable demo is covered below and in DEMO.md.

## Isolated public demo checks

- [ ] Follow Try the demo from the website; verify demo.easyman.app opens without login and the temporary-fictional-data banner remains visible.
- [ ] Try schedule generation/edit/publication and XLSX export; try housekeeping progress/kept assignments/rebalance and prepared PMS files with validation.
- [ ] Try pass-on notes/completion and the labeled frozen example; inspect a recheck and fictional personnel record.
- [ ] Rename the fictional property, move between modules, then reset and refresh; verify the initial property returns. Another tab must have independent state.
- [ ] Check feedback preview and unavailable submission; check explanations for team/account/recovery features.
- [ ] Check narrow layout, keyboard controls and reset-dialog focus/Escape.
- [ ] Verify the signed-in app still requires authentication and its APIs reject anonymous/spoofed identities. Demo hosting has no storage bindings or secrets; its page makes no operational API or persistent-browser-storage calls.
