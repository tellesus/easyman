# EasyMan current product specification

Aligned with the owner's decisions through October 10, 2026. **This is the current requirements document.** [IMPLEMENTATION.md](IMPLEMENTATION.md) describes the code present today; [KNOWN_ISSUES.md](KNOWN_ISSUES.md) records its known gaps; [ROADMAP.md](ROADMAP.md) orders the remaining work.

## Product intent and current stage

EasyMan is a lightweight, privacy-focused hotel operations application intended for reliable daily use by hotel managers, supervisors and frontline employees. It replaces recurring spreadsheets, paper logs and improvised operational documents while complementing the systems a hotel already uses.

The application is currently in development and testing. There are no customer properties or customer records; the local and hosted workspaces contain fictional examples. This is the stage of the project, not a reduction of the product to a mockup. Correct workflows, security, dependable storage, error handling and usable interfaces remain required for eventual live use.

Incompatible example data can be reset and regenerated when a correct implementation needs a new data standard. Do not build migrations or historical backfills solely to protect disposable test records. This exception does not relax correct handling of newly created records, normal history/recovery behavior, or the protection of credentials and infrastructure. A deliberate development reset is distinct from ordinary use, where saving, reloading and recovery must preserve the user's work.

The original **EasyMan — Version 1 Product Specification** supplied by the owner establishes the product's scope. Subsequent owner requests update that specification and the implementation. This document consolidates both. A new owner instruction takes precedence over stale documents; update the affected documents with the implementation. A bug, implementation shortcut, test fixture or older release note does not redefine the requirement. Additional proposals must be labeled as proposals rather than silently becoming requirements.

## Platform and scope

- Responsive web application for desktops, laptops, tablets and phone browsers. Native mobile apps and installation are outside core V1. Mobile layouts need readable cards, appropriate touch targets, filtering and clear actions.
- Seven modules: Scheduling, Housekeeping Boards, Room Check Logs, Training / Coaching Logs, Discipline Management, Shift Pass-On and Developer Feedback.
- Shared property configuration, employees, reporting relationships, accounts, capabilities, authority scopes, rooms, authentication, encryption, audit history, structured imports/exports and configuration recovery.
- Configurable departments, positions, qualifications, shift definitions and staffing rules. Presets initially emphasize Front Office and adjacent Guest Services, without hard-coding a hotel brand or organizational structure.
- A useful home screen surfaces relevant work, overdue follow-ups and escalation according to access. V1 has no push, email, SMS or other notification delivery system.

## Property, employee and access model

Each property is a distinct workspace with its own configuration and operational records. An employee record and a user account are separate concepts; employees need not have accounts, and permissions are explicitly granted to accounts.

Employees have operational profile details, primary and additional department/position associations, qualifications, hire/seniority date, scheduling preferences, desired hours and availability. Personnel information and availability require their own access; viewing a schedule must not expose unrelated sensitive employee fields.

Reporting relationships form a directed graph supporting position-based and individual relationships, multiple reporting paths and rejection of cycles. Reporting relationships support authority scopes; a job title alone does not confer software access. Capability grants combine an action with property, department, position, employee, direct-report or reporting-lineage scope, including configured temporary authority. Default access profiles are starting templates, not substitutes for actual permission checks.

Invitations, employee/account links, membership changes, key provisioning and session management must work end to end. Authorized narrow edits must not unexpectedly require unrelated configuration or publication authority. Both read access and available actions must honor capability and scope. Coaching and discipline require explicit sensitive-record access. Developer feedback is available to authorized users regardless of normal management permissions.

## Security, persistence and recovery

- Authenticate the user and enforce property membership, capability and scope on the server. Hosted Site access and in-app property access are separate controls.
- Encrypt operational record contents in the browser; store ciphertext and wrapped keys with only the metadata needed for authorization and app operations. Separate sensitive record types and wrap keys only for authorized recipients.
- Maintain session expiry, session review/revocation and removal of access for disabled members. Privileged recovery approval must respect revocation. Recovery bootstrap and privileged approval have distinct purposes.
- Preserve auditable writes, material revisions, encrypted historical records and attributable security/configuration/export events. Application users cannot silently rewrite immutable history. Infrastructure administrators and delivered application code remain part of the trust boundary.
- Reject stale concurrent writes rather than silently overwrite another session. Failed saves need a clear failure/retry path and a recoverable local working copy.
- Support passphrase-encrypted account recovery files and administrator-assisted recovery. A different browser must recover the account key; sign-in alone does not transfer it. Incorrect files/passphrases must leave an existing valid key intact.
- Distinguish account-key recovery, configuration backups, encrypted working copies and shift snapshots. Snapshots cover pass-ons, not a whole-property backup. Losing every authorized key and recovery file prevents plaintext recovery.

These are required behaviors. The completed review records fixes and verification, including export action permissions; see [KNOWN_ISSUES.md](KNOWN_ISSUES.md). Encryption alone does not establish that every workflow is correct.

## Configuration and setup imports

Allow manual configuration of departments, positions, employees, reporting relationships, rooms/types, shifts, staffing requirements and relevant property settings. Stable references must remain valid; prevent cycles and unsafe deletion of referenced configuration.

Initial structured imports cover the agreed setup entities, including availability and reporting relationships. Each import offers a schema, example and copyable conversion prompt, followed by validation, readable errors, preview and explicit application. Validate dates, identifiers, references and supported fields rather than silently accepting unusable records. Preserve leading-zero room identifiers as text.

The hotel can use its IT-approved external LLM to prepare an import. EasyMan supplies the format and validates the result; an embedded model is not required.

Provide encrypted configuration backup by default and explicitly acknowledged plaintext export with the appropriate audit event. Support restoring defaults with clear consequences and copying missing defaults into existing configuration without overwriting customization. Working-copy restoration must keep related records consistent and respect normal immutable histories. Granular per-item/per-module default restoration remains outside core V1.

## Scheduling

Generate an editable weekly draft using configured shifts, staffing needs, qualifications and availability. Mandatory constraints include unavailability, qualification and configured restrictions; preferences must not override them. Respect configured hours/rest expectations and explain coverage gaps or unmet preferences.

Desired weekly hours must influence allocation, with clear quality feedback when targets cannot be met. Preferred shifts/days, undesirable transitions, fairness and seniority influence preferences and tie-breaking. Seniority must not defeat staffing needs or make junior employees' schedules unusable. A heuristic is acceptable; silent violations or ignoring a stated target are not explained by the absence of global optimization.

**Days off:** prefer both days off together when possible. Each employee file has **OK with split days off**, unchecked by default. When checked, omit that employee's consecutive-days-off preference. Names in desktop and mobile schedules open the employee file. Changing this setting affects subsequent generation; unrelated profile edits must preserve all existing availability rules, including imported ranges and position/shift qualifiers.

Authorized manual actions include adding, removing and reassigning shifts, adjusting shift times, deliberate warning overrides and regenerating selected dates. Manual changes must check constraints; an hours-limit override must be visible and intentional. Hard eligibility/authority constraints remain enforced. Hour/rest overrides require explicit acknowledgment and a recorded reason. The assignment editor supports individual start/end times and scheduled-hour overrides; those values apply to constraints, totals, publication history and exports without changing the shift template.

Partial generation preserves unselected dates. Assignments outside the editor's authority count as fixed coverage on regenerated dates, so already-covered staffing demand is not filled twice. Editing must respect both source and destination employees/dates/weeks.

Drafts become published through an authorized publish action. Subsequent edits make all affected weeks/employee publication states draft, including both weeks when a shift moves. Historical published copies retain their original assignments and shift times. Editing permission must allow a valid edit without accidentally granting publication authority.

The quality summary should expose coverage, preference satisfaction and actionable hour/rest/transition warnings. Scheduling is not a jurisdiction-specific labor-law compliance engine.

## Daily housekeeping

Daily service needs are explicit and dated; the room catalog alone is not the day's cleaning list. **Set up day / Update day** supports manual room selection and PMS-report preparation through the hotel's approved external LLM:

1. Show instructions, the expected JSON structure and a copyable prompt containing the current room catalog.
2. The user provides the PMS departures/stayovers report to their approved tool and obtains the structured result. EasyMan does not directly connect to the PMS or run that model.
3. Upload the JSON file or paste the result. Validate it before application; report unknown rooms, duplicates, conflicting service, uncertain matches, unsupported/guest-bearing fields and incorrect dates.
4. Let the user review/correct mappings and service choices, then explicitly apply them. No service is the default for rooms omitted from the confirmed day.

Use departures/stayovers, priority and DND holds to determine actionable work. Preserve progress and kept assignments on same-day updates; new days start fresh while dated board history remains available. First-time setup balances by default; same-day updates preserve attendants unless **Balance assignments when applying** is selected. **Rebalance board** remains available separately.

Assign only qualified attendants who are available to work that day. Managers must be able to add/remove attendants from the daily pool; schedule linkage must not make the scheduling module mandatory for housekeeping. This follows the original available-attendant/manual-control requirements. **Working today** stores an explicit roster for each date; first setup starts with no selected attendants. Optional **Use scheduled attendants** suggests qualified scheduled staff whose shifts do not conflict with availability, only when the operator can access scheduling and availability. Managers review that suggestion or select staff manually when scheduling elsewhere. Removing an attendant releases their assignments and locks after an explicit warning, retaining cleaning progress, holds and overrides. An empty roster leaves service tasks unassigned.

Prioritize balanced **workload points**, then consider room count and floor/zone continuity. Room-type default scores initialize new room scores; room/task adjustments remain possible. Indivisible rooms and kept assignments can prevent identical totals, and the UI should make the resulting work clear.

**Keep with this attendant** means retain the assigned attendant during balancing. It does not mean clean, DND, priority or hidden data. DND is a separate service hold. Managers can reassign rooms, adjust daily scores/service/priority and track cleaning progress. Scoped attendants must receive the correct dated service instructions even without access to the complete property-wide plan.

The daily room table uses readable headers for Room, Floor, Zone when present, Service, Attendant and Progress. Values should not repeatedly include their column labels.

## Spreadsheet exports

Provide `.xlsx` downloads usable in Excel, LibreOffice Calc and Google Sheets import. Keep room identifiers as text, numeric hours/workload as numbers, readable spacing and appropriate draft/publication/date labels. Generated files reflect an export-time snapshot; editing them does not write back to EasyMan.

Schedule workbooks include a weekly matrix and detailed shifts, overnight end dates and scheduled-hour totals. Housekeeping workbooks include a manager workload summary, room overview and a separate **portrait Letter attendant handout** per attendant, suitable for printing and folding into a pocket. Handouts need room/location, service/priority, a Done column and space for notes. DND/no-service rooms stay off actionable handouts. Avoid internal attendant IDs and assignment-lock fields in these daily operating sheets; cleaning progress needs a clear operational meaning.

Export requires the actual account's export capability and authorized data scope. A sample access-profile preview is not permission enforcement. Exports must exclude unrelated availability, coaching, discipline and guest pass-on contents.

## Room checks, coaching and discipline

Room check logs record inspector, room, relevant attendant, date/time, result, notes and optional failure category. History can be reviewed by room, inspector, attendant, category, result and date range. A recheck is a separate linked inspection, preserving the original result. Results do not produce automatic discipline or employee-performance scores. C2 is implemented with attendant/category/date controls and all required history filters.

Training/coaching and discipline support their agreed employee, incident/topic, action, acknowledgment and follow-up fields, explicit scoped access, append-only follow-ups and preserved material revisions. Unrelated edits must not reset acknowledgment or remove prior information. No AI-generated coaching/disciplinary decisions or automated formal corrective-action documents are required.

## Shift pass-on and snapshots

Support categorized pass-ons, ownership, room/reference information as appropriate, priority, notes, due/follow-up times, status, escalation, completion/archive and related follow-ups. Frontline users can act on work within their authority. Unresolved issues stay unresolved. Overdue and escalated items are visible in the application without external notifications.

Snapshots are a native application responsibility. They must continue with the browser closed and without a ChatGPT conversation, connected plugin or AI automation. The current architecture uses an every-minute Cloudflare scheduled Worker to invoke the app's authenticated encrypted snapshot engine. Retry, overlap protection and catch-up preserve the exact historical state at each configured property-timezone shift boundary, even when execution occurs later. A persisted native receipt records success/failure, including successful checks with no new boundaries. Manual/browser receipts must not masquerade as native health evidence.

**Inclusion rule:** evaluate each item's state at the snapshot's shift boundary. Exclude an item when it was Completed for **12 elapsed hours or more** at that boundary. Include unresolved items and items completed less than 12 hours earlier. Exactly 12 hours is excluded. Later notes do not restart the clock; reopening makes the item unresolved, and completing it again starts a new completion clock. The earlier 24-hour suggestion and original completed-during-prior-shift wording are superseded by this rule. This is a snapshot inclusion rule, not a rule to delete pass-on records or mark issues completed.

New-data capture must enforce inclusion in the stored snapshot, without relying solely on hiding items in the viewer. Incompatible older fictional records/history can be reset instead of backfilled. Normal newly generated snapshots remain immutable. The historical viewer must expose the relevant frozen operational content: notes/history, owner, priority, room, due/follow-up and escalation context, plus shift boundary and closing/incoming context. Issue 11 tracks missing viewer content; old-data compatibility finding 12 is not a required release task.

Briefing exports use selected Shift Pass-On items only, with a privacy-conscious 16:9 PNG output. They must not surface coaching, discipline or other unrelated personnel records. PPTX generation remains deferred.

## Developer feedback

Support Pain Point, Bug and Feature Request categories with compose/review, draft preservation, submission status and safe retry/idempotency behavior. Explain that feedback leaves the encrypted property environment. Only intentionally submitted text and approved metadata belong in an issue; do not automatically attach hotel records, keys or sensitive personnel/guest content.

Submit through a server-side GitHub App installed on the intended **private** feedback repository (`tellesus/easyman-feedback`), separate from public source (`tellesus/easyman`). Private keys/tokens remain server secrets. GitHub privacy checks and narrow issue permissions are required. The form retains the user's work when submission fails or has an uncertain result. Full two-way issue synchronization and model-based PII screening remain deferred.

## Testing and release decisions

Use this computer, fictional records, synthetic identities, simulated PMS reports and available spreadsheet applications for the present testing stage. Actual team members, phone/tablet hardware and genuine PMS exports are unavailable; record that limit without inventing customer-dependent requirements or treating those capabilities as removed from scope.

Keep intended, implemented, verified and defective behavior distinct. Existing automated successes and historical owner checks apply to the scenarios actually exercised, not every combination of permissions or data. Code-backed regressions and feasible workflow checks should verify fixes. [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) records the coverage and remaining work.

The hosted domain `easyman.app` is the current testing deployment. It is also the intended live domain; being hosted does not establish customer use or release readiness. The package's `1.0.0` value is build metadata. Official release readiness requires an explicit assessment of the agreed workflows, known defects and validation limits. See [ROADMAP.md](ROADMAP.md).

## V1 boundaries

Keep the original seven modules focused. Core V1 excludes direct PMS/OPERA, payroll, HRIS, CRM, brand/API and feedback-platform integrations beyond the agreed GitHub submission; live PMS status; guest messaging; automatic service recovery or compensation authorization; labor-law/payroll/time-clock engines; native mobile apps; notifications; automated personnel decisions/performance scoring; an embedded conversational assistant or PII-screening model; formal corrective-action generation; a customizable inspection-checklist engine; engineering work orders, F&B, security incident and event-management suites; PPTX; granular default restoration; and full two-way GitHub issue management. Manual PMS report preparation through an external approved LLM and application-owned scheduled snapshots remain in scope.

Save-status feedback must reflect pending work immediately and must not mark newer edits saved when an older queued save completes. Warn before leaving while a save remains pending; retain the local retry/conflict workflow.

## Public introduction and open source license — owner update

The owner requested a professional public landing page at easyman.app describing features, scope and intended hotel use. The signed-in workspace is under `/app`; anonymous public page access must not expose operational records. Preserve server membership, capability/scope, encryption, sessions and recovery. Keep legacy property/invitation links functional. The brochure must distinguish fictional examples and development status from customer availability. The owner subsequently approved a separate playable demo at `demo.easyman.app`, using shared UI/business logic with a fresh, temporary fictional property. It must remain isolated from the signed-in workspace and must not alter its features.

The owner selected AGPL for hosted-fork source sharing. Original EasyMan code and documentation use **AGPL-3.0-only**, retaining third-party licenses and offering source/license/no-warranty notices in the website and app. See [WEBSITE.md](WEBSITE.md) and [LICENSING.md](LICENSING.md). This is an owner-approved spec update, not a reduction of operational scope or an official 1.0 release announcement.

## Public demo — owner-approved update

Provide an independent static demo on `demo.easyman.app`, with no database bindings, secrets, authentication, operational API access or persistent browser storage. Reuse EasyMan screens and domain logic through an explicit in-memory runtime. Load fresh fictional schedules, daily housekeeping service/roster, inspections, personnel records and pass-ons with useful current dates. Changes last only in the current tab; reset, refresh or returning from browser back-cache starts fresh. Provide an always-visible demo/fictional/temporary banner, reset confirmation, Things to try, and links to the website and signed-in workspace.

Permit meaningful local edits and real XLSX downloads. Include fictional PMS report/JSON downloads, direct example loading and a validation/mapping example. Account recovery, invitations, session administration and external feedback submission are unavailable with explanations. Snapshot examples must be labeled fictional and must not claim automatic background operation. Preserve every existing authenticated-app feature and security behavior. See DEMO.md for implementation and evidence.
