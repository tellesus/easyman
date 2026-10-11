# EasyMan known issues

Reviewed October 10, 2026 (America/Chicago), against the original V1 specification and the owner's subsequent refinements. Reviewed application source: `7e283d3617701c7379dc63ed47c58bb5c67fba65`. Documentation is now aligned to [CURRENT_SPEC.md](CURRENT_SPEC.md); a later documentation-only revision does not mean these code findings are fixed.

The original review numbered 15 findings. **14 remain open; finding 12 is withdrawn as a required legacy-data compatibility task.** Its number is retained for continuity. EasyMan is intended for real operational use, but there are currently no customers and all property records are fictional. Incompatible examples may be reset after a fix; the live-use scope and new-data correctness requirements remain intact. No application defect is marked fixed by this documentation pass. Twelve focused scenarios were reproduced with fictional data, actual storage handlers/encryption, or the actual UI form/callback code. Four additional findings are directly visible in the rendering/configuration paths; the two narrow-permission scenarios are grouped into one finding below. No property data, access settings, automations, or application behavior were changed by the review. Review harnesses are checkout-local and ignored by Git.

## High priority

### 1. Routine employee edits destroy richer availability rules

The employee form recreates an employee's entire availability list from only individual dates and recurring weekdays. Editing a name or split-days-off preference drops imported date-range restrictions. Shift/position-specific restrictions lose their qualifiers when rebuilt as simple dates/weekdays. Reproduction: a valid evening-only October 5–12 restriction became an empty availability list after a name-only edit. Preserve unsupported rules during general profile edits and give them a dedicated editor/review.

Source: [employee save](app/workspace.tsx#L111), [form](app/workspace.tsx#L123).

### 2. Reassigning an existing scheduled shift is rejected by the backend

The UI offers reassignment and keeps the assignment ID, but changing the employee changes the encrypted resource's subject. The API permits subject changes only for housekeeping boards. Even a full administrator receives HTTP 400, `Record scope cannot be relabeled.` The UI has already changed its local working copy and announced a draft save, while cloud synchronization fails. Treat authorized schedule reassignment as a supported operation, checking authority for both employees and preserving the previous version.

Source: [assignment edit](app/workspace.tsx#L112), [resource validation](app/api/team-workspace/route.ts#L9).

### 3. Scoped housekeeping users receive incorrect service instructions

Daily plans are deliberately withheld from users with department/employee scope, while their assigned task records are readable. `housekeepingDay` interprets the missing plan as a legacy board and substitutes room-catalog flags instead of the task's dated service. With actual encrypted scoped records, a saved stayover displayed as a departure. Use the service on the authorized dated task when the full plan is unavailable.

Source: [daily view](app/housekeeping.ts#L43), [scoped view](app/housekeeping-ui.tsx#L15).

### 4. Housekeeping has no genuine daily attendant pool

Automatic setup and rebalancing use every active employee qualified as an attendant. They do not consult the selected day's schedule or unavailability, and there is no daily add/remove-attendant selection. Reproduction assigned a room to an employee explicitly unavailable and not scheduled that day. Reassigning their rooms manually does not keep them out of the next rebalance. Add an explicit available-today roster; optional schedule integration must also support hotels that do not schedule housekeeping in EasyMan.

Source: [eligibility and balancing](app/domain.ts#L104), [day setup](app/housekeeping.ts#L82), [attendant UI](app/housekeeping-ui.tsx#L17).

### 5. Narrow editing permissions do not work end to end

Two reproduced cases expose hidden permission dependencies. A user with Scheduling.Edit and Availability.View, but no Scheduling.Publish, cannot save a draft edit of a published week: saving its draft marker requires publication permission. An employee manager without Property.Configure cannot save a name-only edit for an employee with reporting relationships: the editor unnecessarily replaces relationship IDs, then attempts a forbidden deletion of the old relationship. Authorized editing needs to avoid unrelated privileged writes or handle its required metadata within the authorized operation.

Source: [save permissions](app/team-client.ts#L14), [publication permission](app/access.ts#L12), [employee editor](app/workspace.tsx#L111).

### 6. Scoped schedule generation can overstaff covered shifts

The UI retains assignments outside the editor's authority, but the generator ignores those assignments on regenerated dates and tries to fill the full staffing requirement again. Reproduction: one required position, already filled by a protected assignment, became two assignments after generation. Preserve protected assignments as fixed coverage and generate only remaining demand.

Source: [generation callback](app/workspace.tsx#L81), [fixed assignments](app/domain.ts#L65).

### 7. Moving a published assignment can leave the original week marked Published

Editing a shift's date invalidates only its destination week. The source week retains its publication marker; after reload it can be labeled Published despite the assignment having moved out. Reproduction left the original week with zero assignments but a retained published marker. Invalidate every affected source/destination week and employee; keep the original publication archive intact.

Source: [assignment mutation](app/workspace.tsx#L112), [configuration-only invalidation](app/domain.ts#L147).

## Further findings

### 8. Session revocation is not checked during recovery approval

Using the same revoked administrator application-session cookie, the workspace returned 401 but account-key recovery approval returned 200 and changed the recipient's public key. The recovery approval path checks identity/membership but does not check the application session. This still requires a valid platform sign-in and administrator authority; it is not anonymous access. Bootstrap recovery requests and privileged approval should have separate session requirements.

Source: [recovery approval](app/api/recovery/route.ts#L3).

### 9. Desired weekly hours are not used as scheduling targets

The generator balances raw hours and enforces maximums, but `employee.hours` only contributes a final under-hours message. Reproduction gave an 8-hour-target employee and a 40-hour-target employee 24 hours each, even though 8/40 was feasible with unchanged coverage and preferences. Those under-hours messages are also not shown by the generation callback. Desired hours should influence candidate ranking and be included in the quality summary.

Source: [generator](app/domain.ts#L65), [generation feedback](app/workspace.tsx#L81).

### 10. Manual scheduling bypasses configured weekly maximums

The generator enforces maximum hours, but manual assignment validation checks qualification, availability, overlap and rest only. Reproduction saved 48 hours against a configured 40-hour maximum without an override warning or acknowledgment. If overrides are allowed, make the exceeded limit and deliberate override explicit.

Source: [assignment checks](app/domain.ts#L56), [manual save](app/workspace.tsx#L112).

### 11. Snapshot data is preserved but much of it is unusable in the viewer

The snapshot modal shows only subject, status and original description. It does not show frozen notes/history, owner, priority, room, follow-up time or escalation. An important update added as a note before handover is stored but absent from the historical handover screen. Render the operational details from the frozen item, rather than sending users to the later live record.

Source: [snapshot modal](app/workspace.tsx#L138).

### 12. Legacy cutoff compatibility — withdrawn as required work

The review found that historical encrypted records without authenticated expiry metadata can enter a snapshot payload and be filtered only after decryption in the viewer. This describes the older-data fallback currently in code; it is not the required design for new records.

The owner clarified that all existing records are fictional and incompatible examples can be wiped/replaced. **Do not require historical backfill, legacy preservation or a compatibility migration to release this app.** This is not an active release blocker. If a corrected implementation needs a clean data standard, reset the affected examples and generate fresh ones. No reset was performed during documentation alignment.

The requirement for new data remains strict: at the historical shift boundary, exclude items completed for 12 elapsed hours or more from the stored snapshot. Include unresolved/recently completed items. Future records and normal snapshot history must work correctly. See [CURRENT_SPEC.md](CURRENT_SPEC.md).

Source: [capture filter](app/snapshot-server.ts#L39), [viewer fallback](app/workspace.tsx#L40).

### 13. Editing discipline can reset acknowledgment to Pending

The acknowledgment select has no default bound to the saved record. It opens at its first option, Pending, and the save always writes that value. An unrelated edit can therefore replace Acknowledged or Declined. Bind the saved value and preserve it unless deliberately changed. This finding comes from the form/save path rather than a live HR-record test.

Source: [form](app/workspace.tsx#L126), [save](app/workspace.tsx#L114).

### 14. Room-type workload defaults are not connected to new-room scoring

Room types expose configurable default workload points, but Add room starts its points field at 1 regardless of selected type. Balancing uses the individual room score. A new suite can therefore start at 1 even when its configured type default is 2 or 4. Type defaults should initialize new room scores; explicit room/day overrides should remain independent.

Source: [new-room form](app/workspace.tsx#L139), [type default](app/config-editor.tsx#L6), [workload calculation](app/domain.ts#L108).

### 15. Export permission exists but the export controls do not enforce it

OperationalData.Export is a defined manager capability, but spreadsheet exports check the sample Frontline preview setting rather than this capability. A user who can view scheduling/housekeeping but lacks export permission is still offered export. Server data scoping remains in place; this is an action-permission gap, not proof of unrelated-record disclosure. Use the actual account's capability and authorized scope for the export controls.

Source: [export handler](app/workspace.tsx#L43), [capability template](app/access.ts#L32).

## Documentation alignment and original-scope coverage

The documentation alignment replaces the contradictory release/development labels, obsolete linked-hourly-task instructions and undated test counts. The application remains intended for real hotel operations, currently undergoing fictional-data testing. Owner-requested changes are specification updates. See [IMPLEMENTATION.md](IMPLEMENTATION.md), [ROADMAP.md](ROADMAP.md) and [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md).

Comparison with the original specification also identifies two completeness checks to carry forward. These are not added feature scope or newly reproduced defects:

- **C1 — Manual shift times:** original scheduling requirements allow adjusting shift times. The inspected assignment form selects a shift template; it does not demonstrate a per-assignment time adjustment. Verify/complete this intended workflow alongside scheduling fixes.
- **C2 — Room-check detail and review:** original requirements include an optional failure category and relevant attendant, and history review by room, inspector, attendant, category, result and date range. The inspected form/result tabs do not demonstrate the complete workflow. Verify/complete the original requirements; do not silently reduce them to the current controls.

## Review limits and next steps

These findings are code-backed development defects, not incidents reported by a customer property. The focused review used this computer, fictional data and isolated identities. Actual team/device/PMS validation remains unavailable, separately from the synthetic checks we can perform now. The native Cloudflare scheduler is appropriate application infrastructure; the external-LLM housekeeping preparation workflow was explicitly requested. Neither is counted as a workaround defect.

The earlier automated checks remain useful evidence for their scenarios, but did not cover these complete workflow combinations. Fixes and targeted regressions are pending in the order described by [ROADMAP.md](ROADMAP.md). The original private local reproduction harnesses are not portable acceptance tests; promote useful scenarios into the repository tests when fixing the corresponding behavior.
