# Fictional housekeeping walkthrough

This fixture exercises the intended daily housekeeping workflow for EasyMan, a hotel operations application being developed for real use. Current testing uses fictional data and no live property. See [CURRENT_SPEC.md](../../CURRENT_SPEC.md) for requirements and [KNOWN_ISSUES.md](../../KNOWN_ISSUES.md) for current gaps.

The files contain invented room movements for the default Linden House room catalog:

- `simulated-pms-report.csv` represents a PMS export with deliberately varied labels and an unknown room.
- `simulated-llm-result.json` is a **hand-prepared expected conversion**. It does not prove that a particular external LLM produces valid output.

The workflow deliberately lets a hotel use an LLM approved by its IT team. EasyMan supplies a copyable conversion prompt, the current room catalog, date and strict format, then validates a pasted/uploaded result. It does not send the report to a model itself; an embedded model or direct PMS integration is not required by this workflow. The converted file must exclude guest names and other unnecessary guest information.

## Prepare

Use the default example catalog or inspect differences before following the expected counts below. The fixture's service date is **October 10, 2026**. For a later test, change the report date, selected date and JSON date together; preserve the report's next-day departure as next-day. Past boards are read-only. If the chosen date already has a plan, the same-day update defaults will apply instead of new-day defaults.

A fix may require replacing incompatible example data; preserving old fixtures or hosted dummy records is not a migration requirement. No reset is performed by this walkthrough itself.

## Walk through the workflow

1. Select the fixture's date in Housekeeping and choose **Set up day**.
2. Copy the prompt. Verify it contains the actual room catalog, selected date, allowed service values and instructions. The hotel can provide this prompt and the simulated report to its approved LLM. If no external model is available, use the hand-prepared JSON to test EasyMan's import/review stages and record that conversion itself was not tested.
3. Upload the JSON or paste its contents. Room `999` must remain unresolved and Apply must stay disabled. Exclude that deliberately unknown room explicitly; do not silently turn it into another room.
4. With the unchanged default catalog, confirm **3 departures, 3 stayovers and 18 no-service rooms**. Only `201`, `202`, `203`, `204`, `301` and `302` need service. Next-day departure `205`, declined-service stayover `206` and arrival-only `303` must not be assigned from this report. Inspect the full no-service list before confirming. Different catalogs require different expected counts.
5. For a new day, select the fictional attendants under **Who is working today?**, leave **Balance assignments when applying** selected and choose **Apply & balance**. Verify the six service rooms and workload totals. Open **Working today**, remove an attendant, review the assignment-release warning and rebalance. Verify only selected staff receive work after reload and cleaning progress remains. An empty roster leaves tasks unassigned; a new date starts with no attendants selected. Optional authorized schedule suggestions should exclude unavailable shifts. This synthetic fixture does not certify a real PMS export or real team.
6. Mark one room clean and select **Keep with this attendant** on another. Rebalance; expect progress and the kept assignment to remain. The control fixes who receives the room during balancing.
7. Set room `301` to DND and rebalance. Expect it outside active attendant work and handouts, still visible as a hold. Clear DND and rebalance to resume service.
8. Re-import the same JSON and exclude `999` again. Same-day updates default to balancing off so existing assignments remain. Expect progress, kept assignments and DND holds to persist and no duplicated tasks. Enable balancing explicitly to redistribute eligible unlocked assignments.
9. Export the board. The filename and workbook must show the **selected service date**, not merely the download date. In an available spreadsheet app, check the manager overview and per-attendant tabs. Print a handout: portrait Letter, readable floor/type separation, a Done column and note space suitable for folding into a pocket. Only active assigned work belongs on handouts.
10. Select the next day and set up rooms manually. Expect fresh progress, assignments and DND holds. Return to the previous date, reload and verify its board remains. If that date is in the past, expect read-only access.

## Invalid-input and access checks

Test malformed JSON, a wrong date, numeric room identifiers, unknown service values, duplicate/conflicting entries, empty arrays and unexpected guest fields. Invalid input must not change the saved board; an all-no-service plan requires explicit confirmation. Test both upload and paste.

A full-administrator walkthrough does not prove scoped-user behavior. Issue 3 currently causes some scoped users to see a stayover as a departure when the full daily plan is withheld. Retest that actual encrypted scoped-user path after the correction; do not use a sample profile preview as proof.

Record source/build, selected date, catalog differences, browser/spreadsheet versions, steps and expected/observed results in [TESTING_CHECKLIST.md](../../TESTING_CHECKLIST.md). A successful fixture import verifies that scenario, not every real PMS report or external-model conversion.
