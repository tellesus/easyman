# Fictional housekeeping walkthrough

These files contain invented room movements for the sample Linden House catalog. Use the local sample workspace, not real hotel records. The example date is October 10, 2026; when testing later, change the report and JSON dates together to a current or future date.

1. Open Housekeeping and choose October 10, 2026. Select **Set up day**.
2. Copy the prompt. Verify it lists the catalog, selected date and allowed service values. A hotel can give this prompt and `simulated-pms-report.csv` to its approved LLM. EasyMan does not send the report to any model.
3. `simulated-llm-result.json` is a hand-prepared example of the expected conversion, not proof that a particular external LLM will produce it. Upload it or paste its contents.
4. Room 999 must appear as an unresolved entry, and Apply must remain disabled. Exclude this fictional unknown room. Confirm 3 departures, 3 stayovers and 18 rooms with no service. Future departure 205, no-service stayover 206 and arrival-only 303 must not be assigned.
5. Leave **Balance assignments when applying** selected and choose **Apply & balance**. This is the default for a new day. Only rooms 201, 202, 203, 204, 301 and 302 should receive attendants.
6. Mark one assigned room clean; keep a second with its attendant. Rebalance and verify both cleaning progress and the kept assignment remain.
7. Open room 301 and select DND. Rebalance and verify it is held off active attendant cards and printed handouts. Clear DND and rebalance to restore service.
8. Update the day using the same JSON, excluding 999 again. Same-day updates leave balancing off by default so current attendants remain. Confirm progress and kept assignments remain. Repeat without changing the selection and verify no duplicate tasks. Select balancing explicitly when you want to redistribute unlocked rooms.
9. Export the board. The date and filename must reflect October 10, not the download date. Open the workbook in an available spreadsheet app. The master list shows no-service rooms; portrait attendant tabs contain only active assigned work.
10. Choose the following day and set up rooms manually. It starts with fresh cleaning progress and DND holds, then balances qualified attendants by default. Return to October 10 to verify the previous board is preserved. Reload and check both dates again.

Additional validation checks: malformed JSON, wrong file date, numeric room numbers, unknown service values, duplicate room entries with conflicting services, empty arrays, and an unexpected guest-name field. Invalid input must leave the saved board unchanged. All-none service requires explicit confirmation.
