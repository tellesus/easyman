# EasyMan testing checklist — one computer

Use this checklist together, one section at a time. Use the sample property and invented records only. A checked box means the observed result matched the expectation; leave failed or untested checks unchecked. Record the build, browser, date and evidence below. Tests requiring other people are deferred, not assumed to pass.

**Build:** __________ **Browser:** __________ **Date:** __________

**Results:** Pass ___ / Fail ___ / Deferred ___

## 1. Prepare and protect the working copy

- [ ] **P01 — Baseline:** Open EasyMan, confirm the expected property and “Encrypted · saved,” then reload. Expect the same rooms, employees, progress and records.
- [ ] **P02 — Backups:** Export an encrypted configuration backup, an encrypted working copy, and the account recovery file from Account options. Keep their passphrases outside the files. Expect three usable downloads; account recovery and configuration backups serve different purposes.
- [ ] **P03 — Test labels:** Use `TEST —` in new record subjects and invented employee/room names. Record the original property name, time zone and shift-change times before changing settings. Do not reset the workspace or clear browser storage.

## 2. Settings, employees and imports

- [ ] **C01 — Settings:** Change the property name, save and reload, then restore it. Expect the name to persist both times.
- [ ] **C02 — Time zone:** Check the configured IANA time zone and shift-change times. Expect scheduling, incident times and snapshots to use the property zone. Do not change the computer clock.
- [ ] **C03 — Configuration:** Add an unused test department, position, shift and room type; edit them, disable a supported item and remove only unused items. Expect stable existing IDs and a clear refusal when a referenced item is removed.
- [ ] **C04 — Employee:** Add an invented employee with a department, position, qualifications, seniority and weekly-hour limit; edit and reload. Expect the saved values and additional department affiliations to remain.
- [ ] **C05 — Reporting:** Add a position-based and an individual reporting link. Try a circular relationship. Expect valid links to save and the circle to be rejected without changing the saved graph.
- [ ] **C06 — Import preview:** Use the importer’s example for a small valid employee or room import. Preview and cancel. Expect no new records. Preview again and confirm; expect exactly the reviewed records.
- [ ] **C07 — Invalid imports:** Try a duplicate ID, unknown department/room type, impossible calendar date and unexpected employee field. Expect a useful error and no partial import.

## 3. Scheduling and its spreadsheet

- [ ] **S01 — Generate:** Generate a draft with test staffing rules. Expect only qualified, active employees, no overlapping assignments, and the configured rest/hour limits to be respected.
- [ ] **S02 — Availability:** Give a test employee a hard unavailable day/date range and a shift-specific restriction; regenerate. Include an overnight shift ending on an unavailable day. Expect no assignment violating those restrictions.
- [ ] **S03 — Infeasible staffing:** Request more qualified people than are available. Expect uncovered staffing to be reported instead of violating hard restrictions.
- [ ] **S04 — Manual edits:** Add, change and remove a test assignment. Expect valid edits to persist and invalid assignments to be rejected with an explanation.
- [ ] **S05 — Partial regeneration:** Regenerate selected days only. Expect unselected days to remain identical and still constrain overlap, rest and weekly hours.
- [ ] **S06 — Publish:** Publish a draft, then change a draft assignment or shift template. Expect the publication/history to retain the originally published assignment and shift times.
- [ ] **S07 — Schedule XLSX:** Export the selected week and open it in a spreadsheet app available on this computer. Expect a valid workbook, the correct week, separate employees even when names match, numeric totals and correct next-day end dates for overnight shifts.

## 4. Rooms, housekeeping and its spreadsheet

- [ ] **H01 — Room catalog:** Add an invented room numbered `007`; edit its type, floor and workload points. Expect the leading zeros and fractional points to persist.
- [ ] **H02 — Balance:** Generate a board with uneven scores and qualified employees. Expect room coverage, useful workload totals and no DND room in active cleaning assignments.
- [ ] **H03 — Locks and progress:** Lock an assignment, mark another room clean, then rebalance. Expect the locked assignment and completed progress to remain.
- [ ] **H04 — Overrides and reassignment:** Set a temporary score/flag override and manually reassign a room. Expect totals and exported values to reflect the override without silently rewriting the room catalog.
- [ ] **H05 — DND:** Flag a room DND, including a previously locked assignment, and rebalance. Expect it to remain visible as DND outside active cleaning work.
- [ ] **H06 — Board XLSX:** Export the board and open it. Expect `007` to remain text, unassigned and DND rooms to be represented, fractional totals to stay numeric, and cleaning progress to match the board. Expect no attendant-ID or assignment-lock fields. Print a named attendant tab: portrait Letter, rooms sorted by floor/zone, readable room types, Done boxes and supervisor-note lines. DND and inactive assignments stay off handouts. Large lists may continue on another portrait page rather than shrinking to unreadable text.

## 5. Inspections, coaching and discipline

- [ ] **R01 — Inspections:** Log a pass and a fail/recheck for invented rooms. Add the recheck as a separate inspection. Expect the initial result and later recheck to remain in history.
- [ ] **R02 — Inspection boundaries:** Expect inspection failures to remain inspection records; they must not automatically create disciplinary decisions.
- [ ] **R03 — Coaching:** Create a test coaching record, add expected improvement and follow-up details, then edit it. Expect the latest content, earlier revision and append-only follow-up to be accessible after reload.
- [ ] **R04 — Discipline:** Create an invented disciplinary record, edit its details and add a follow-up. Expect the original incident/employee association and prior content to remain preserved.

## 6. Pass-ons and automatic snapshots

- [ ] **L01 — Pass-on lifecycle:** Create a `TEST — handover` item with category, priority, owner, room, due time and description. Add a note, escalation and related follow-up. Expect every change to survive reload and appear in the appropriate filters.
- [ ] **L02 — Completion:** Complete the item. Expect it to leave the open board and remain in Archive with its history.
- [ ] **L03 — Briefing:** Export a privacy-conscious PNG briefing. Expect a readable 16:9 image containing pass-on information without coaching/discipline records or room/description details excluded by privacy mode.
- [ ] **L04 — Background heartbeat:** In Shift pass-on → Snapshots, use Refresh status. Expect a recent “Last background check” after a scheduled run. Refreshing this status does not itself capture anything or create a background receipt. Zero new snapshots is normal when no boundary is due.
- [ ] **L05 — Closed-browser handover:** Before a configured boundary, create a unique open `TEST — snapshot` item and wait for “Encrypted · saved.” Close the app tab before that boundary. After the next hourly background check, reopen the app and inspect Snapshots. Expect a capture stamped at the exact boundary and a background receipt from after it. Scheduler start times can be delayed.
- [ ] **L06 — Historical freeze:** Complete or edit that item after the boundary. Reopen the earlier snapshot. Expect its original boundary-time state, not the later edit. Later-created items must not appear in an earlier snapshot.
- [ ] **L07 — No duplicates:** Refresh/reopen snapshots repeatedly. Expect one capture per property/boundary, not duplicate copies. Automated checks also exercise repeat capture requests and catch-up batches.
- [ ] **L08 — Catch-up:** If the app has been closed across multiple boundaries, inspect the next background run. Expect all due boundaries since the previous capture. Long gaps process up to 31 calendar days per run and continue on later runs.

## 7. Files, recovery, feedback and two browser windows

- [ ] **B01 — Backup privacy:** Open the encrypted backup/working-copy/recovery JSON as text. Expect encrypted data rather than readable employee/coaching/discipline descriptions. Store passphrases separately.
- [ ] **B02 — Restore preview:** Select the encrypted working copy, enter its passphrase and preview; cancel. Expect the workspace to remain unchanged. Try a wrong passphrase; expect rejection without corruption. Only confirm a restore after checking the preview and retaining the baseline backup.
- [ ] **B03 — Recovery on this computer:** After verifying the exported recovery file is safely stored, use a separate browser profile with the same ChatGPT account to restore the account key. Expect authorized records to decrypt there. Keep the original working browser intact throughout this test.
- [ ] **B04 — Concurrent saves:** Open the same property in two browser windows. Edit from one, then attempt a stale edit in the other. Expect a conflict/reload message instead of silently overwriting newer work. Two windows using one account do not prove different-user permissions.
- [ ] **B05 — Feedback:** Compose invented feedback, save its draft, reload, review and submit once. Expect the private issue number and matching category. On a failure, expect the encrypted draft to remain. Do not send real guest or employee information.
- [ ] **B06 — Connection interruption:** Briefly disconnect the computer’s network while making a harmless test edit, then reconnect. Expect an honest sync/error state and locally preserved work; confirm the intended saved result after reload. Avoid editing the same record elsewhere during the interruption.

## 8. Layout and spreadsheet applications

- [ ] **U01 — Narrow browser:** Resize the window to a phone-like width. Check navigation, forms, dialogs, tables/cards, buttons and exports. Expect readable controls without blocked actions or overlapping text. This simulates a narrow screen; it does not certify actual mobile hardware.
- [ ] **U02 — Keyboard:** Use Tab/Shift+Tab through a form and modal; close the modal with Escape. Expect visible focus and focus to stay within the modal until it closes.
- [ ] **U03 — Spreadsheet compatibility:** Open both exports in each available target: Excel [ ], LibreOffice Calc [ ], Google Sheets [ ]. Record unavailable apps as Deferred. Verify values, dates, totals and room-number formatting, and save/reopen a copy. Use only synthetic exports for cloud uploads.
- [ ] **U04 — Literal text:** Give an invented employee/room a name beginning with `=` and export. Expect literal text, not an executed spreadsheet formula.

## Automated checks we can run here

The local suite covers schedule constraints/partial regeneration, imports, encryption and recovery-file passphrases, workbook structure, scope/recipient rules, session revocation, stale writes, feedback retries, exact historical snapshot state, background receipts, owner-only snapshot tools and bounded catch-up. These use isolated synthetic accounts/data. Record the current automated result: ___ tests passed; type check ___; production build ___.

## Deferred until additional accounts or devices are available

- [ ] **D01 — Real account invitation and approval**, including access to the private Site as well as property membership.
- [ ] **D02 — Real manager/frontline access**, confidential records, grants, reporting scopes and disabled-account behavior. The sample access-profile preview checks navigation only; it is not a security test.
- [ ] **D03 — Administrator-assisted recovery** and historical-key provisioning with a genuinely different administrator account.
- [ ] **D04 — Actual phone/tablet behavior**, plus real hotel staffing/workload acceptance by the people who will use it.

## Record failures

For each failure, record: check ID, steps, expected result, observed result, property time zone, build/browser and a screenshot using invented data. Re-test the affected section after a fix. Do not mark Deferred checks as passed, and retain this checklist with the release notes.

| Check ID | Result / evidence | Fix and re-test |
| --- | --- | --- |
| | | |
| | | |
| | | |

## Schedule days-off preferences

- [ ] **S08 — Employee file:** Click an employee name in the desktop or narrow-screen schedule. Expect the matching employee file, then use Edit employee to reach the split-days-off checkbox without leaving the schedule.
- [ ] **S09 — Consent and persistence:** Leave “OK with split days off” unchecked, save and reload. Expect “Try to keep days off together.” Check it, save and reload; expect “OK with split days off.” Changing the preference does not alter existing assignments.
- [ ] **S10 — Draft generation:** Regenerate with suitable fictional staffing and availability. Expect the builder to favor consecutive days off for employees without consent while keeping coverage, qualification, rest and hour checks. Consenting employees may receive consecutive or split days off. Hard restrictions can still require split days off. Re-test partial generation to confirm untouched days stay fixed.

- [ ] **R06 — New-browser recovery form:** In a separate browser signed into the same account, expect instructions for exporting from the working browser. Restore stays disabled until a file and passphrase are provided. Empty, malformed or wrong-format files and a wrong passphrase show a useful message, and do not replace the browser key. A matching account recovery file opens the same property after reload. Keep the original working browser and backup intact throughout.
