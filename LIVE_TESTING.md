# EasyMan — hosted testing on easyman.app

Documentation aligned October 10, 2026 (America/Chicago).

EasyMan is intended to become a reliable hotel operations product. The hosted application is currently a development/testing environment with fictional data and no customers. A reachable domain or a `1.0.0` build label does not establish official release readiness. [CURRENT_SPEC.md](CURRENT_SPEC.md) defines the agreed behavior; [KNOWN_ISSUES.md](KNOWN_ISSUES.md) records completed corrections and verification limits.

This file preserves dated observations. It does not claim those tests were repeated during documentation alignment or that passing examples establish every workflow combination. Use [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for the next run and [ROADMAP.md](ROADMAP.md) for the remaining work.

## Addresses and access

- Canonical hosted testing address: [easyman.app](https://easyman.app/).
- Original managed address: [easyman-hotel-ops.michaelleza.chatgpt.site](https://easyman-hotel-ops.michaelleza.chatgpt.site/).
- Both addresses connect to the same Sites project, deployment and property database. They are not isolated test environments; edits through either affect the same example records.
- Site access remains private to the existing allowed account. Another tester would need both private Site access and EasyMan property invitation/approval. A custom domain grants neither.
- Account keys and sessions are browser/origin-specific. Signing in does not itself transfer a decryption key; first use in another browser/origin may require the account recovery file.
- `www.easyman.app` was not configured in the recorded setup.

## First sign-in or another browser

1. For a recovery test, keep the working browser available. In Account options, download the account recovery file using a passphrase of at least 12 characters; keep the passphrase separately.
2. If the current example state matters to the test, retain an encrypted working copy and configuration backup. These serve different purposes from account recovery.
3. Open [easyman.app](https://easyman.app/) and sign in with the same account.
4. If prompted, import the recovery file and enter the passphrase in the application. Expect access to that account's authorized example property records.
5. Reload and confirm “Encrypted · saved.” Invalid files/passphrases must not replace the stored account key.

An incompatible example workspace can instead be deliberately reset and regenerated after a fix. Preserving obsolete dummy data is not a project requirement, and a data reset is not a reason to delete infrastructure or credentials. See [RECOVERY_AND_ROLLBACK.md](RECOVERY_AND_ROLLBACK.md).

## Hosting and connectivity observations — October 9, 2026

The recorded setup checks found:

- Active Sites custom-domain binding, provider hostname and SSL certificate, with expected DNS targets and ownership TXT records.
- HTTP-to-HTTPS redirection and sign-in returning to `https://easyman.app/`.
- Anonymous root, workspace API and snapshot-status API responses of 401 with `no-store`; fake identity headers did not authorize access.
- The signed-in domain opened the same example workspace with “Encrypted · saved.” Michael subsequently confirmed same-account recovery/reload and invalid-file/passphrase rejection on this computer.
- The custom-domain `/mcp` path returned anonymous 404. The provisioned connector endpoint remained separate. Connector availability is not required for the native snapshot timer.

These observations establish the recorded setup behavior, not a fresh audit of the domain or every authorization path.

## Owner-reported workflow session — October 9, 2026

Michael reported **12 passed broad checks and 1 pending housekeeping check**. The following table preserves that report, including the boundaries of what it establishes. The application changed afterward, and the later code review found defects in scenarios beyond these broad checks.

| Owner-reported check | Recorded result | Interpretation today |
| --- | --- | --- |
| HTTPS and same-domain sign-in/return | Passed | Historical hosted-domain check. |
| Signed-out access without importing a key | Passed | No property records exposed in the checked browser flow. |
| Same-account recovery, reload and wrong-input rejection | Passed | Historical recovery check on this computer. |
| Fictional pass-on create/edit/complete/archive/history | Passed | Does not establish every snapshot-viewer detail. |
| Schedule employee files, split-days-off consent, generation and partial generation | Passed | Later review identified availability preservation, reassignment, scoped generation, hours and publication defects. |
| XLSX exports in available applications | Passed with LibreOffice feedback | Layout and attendant-handout refinements followed; application-specific coverage must be recorded separately. |
| Housekeeping progress, kept assignment, rebalance and DND | Pending | Subsequent assistant checks are recorded below; they do not turn this owner check into a pass. |
| Room inspection and separate recheck history | Passed | Historical fictional-record check. |
| Coaching/discipline revisions | Passed | Later review found acknowledgment preservation failure; sample access previews do not prove permissions. |
| Background receipt, closed-app boundary and frozen snapshot | Passed on the earlier architecture | This preceded replacement of the AI task. It does not certify native closed-browser boundary capture. |
| Synthetic private feedback and categories | Passed | Synthetic issues were closed after verification. |
| Narrow-window and keyboard behavior | Passed | Actual phones/tablets remain untested. |
| Disconnect/reconnect, retry and conflict awareness | Passed | Historical same-computer check, not full multi-user validation. |

## Assistant observations — October 10, 2026

### Housekeeping and spreadsheets

Local fictional walkthroughs exercised the copied room-catalog prompt, JSON paste/upload, blocked unknown rooms, explicit exclusion, same-day re-import, balancing, progress, kept assignments, DND, manual preparation of another day and historical reload. The conversion JSON was hand-prepared; no actual PMS report or external LLM conversion was tested.

The hosted six-room example was rebalanced from **1 / 3 / 4.25** to **3 / 3 / 2.25** workload points and reopened with those totals. This demonstrates that particular balancing result; the later review identified the separate missing daily-attendant-pool and scoped-service issues.

The revised dated workbook was independently recalculated without formula errors and printed through native LibreOffice: three portrait Letter handouts with the selected date and five active rooms, excluding the DND hold and no-service rooms. These are recorded assistant results, not evidence for unavailable spreadsheet applications.

### Isolated setup, restore and publication

A separate localhost workspace started empty and remained empty after reload. An encrypted fictional working copy was previewed/restored there, with property data, progress, a kept assignment and DND surviving reload. Isolated handlers exercised wrong-passphrase rejection and restoration into an empty property.

A locally published schedule retained its original history after a shift-template edit, and the affected current week returned to draft. This scenario passed; the later review separately reproduced incorrect publication status when moving an assignment between weeks. No hosted example reset was performed during those checks.

### Native scheduler and 12-hour cutoff

The required unattended snapshot feature now uses application infrastructure: a Cloudflare Cron Worker calls the managed app with machine authentication and signed requests. It does not require an open browser, ChatGPT session or an AI automation. The owner handles deletion of the obsolete AI task; its cleanup is not part of the native feature's runtime or this documentation task.

The recorded native deployment had an every-minute cron enabled, with Workers development and preview URLs disabled. A read-only authenticated probe observed a genuine scheduled invocation at **2026-10-10 18:57:23 UTC**, starting at **18:57:28.568** and succeeding at **18:57:30.134 UTC** (1:57 p.m. America/Chicago): **one property checked, zero new captures, zero failures**. No hosted capture POST was manually issued for that observation. A later recorded successful receipt at **21:05:27.796 UTC** (4:05 p.m. Central) also showed one property checked and zero captures/failures.

These receipts verify real timer execution and persisted health reporting. Since no boundary was newly captured in those runs, a hosted synthetic closed-browser boundary test on the native architecture remains pending. Local tests exercised historical before/after state, retries, signature handling, leases and bounded catch-up.

The latest source also implements exclusion, at the snapshot boundary, of items completed for **12 elapsed hours or more**. Unresolved and more recently completed items remain eligible; later notes do not restart the clock. Local synthetic checks cover the exact cutoff, delayed capture, history, reopening and authenticated expiry metadata. The user permits resetting incompatible legacy examples instead of building backfill solely to preserve them. The frozen snapshot viewer still has a known completeness defect (issue 11).

### Automated result and review limits

The latest recorded full application check run at source **`7e283d3617701c7379dc63ed47c58bb5c67fba65`** is **77 tests passed, TypeScript checks passed and build succeeded**. Earlier 68- and 73-test totals described earlier revisions. The 77-test suite was not rerun for documentation alignment. Type checks and a fresh build of the two help-text corrections passed; neither corrects the review's behavioral findings.

The subsequent review found additional complete-workflow defects despite that passing suite. Its findings and completed regressions are in [KNOWN_ISSUES.md](KNOWN_ISSUES.md) and [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md). Neither these observations nor build metadata establish an official `v1.0.0` release/tag or finished acceptance.

## Hosting record and operational references

Recorded configuration, to be read back before infrastructure changes:

| Item | Recorded value |
| --- | --- |
| Sites project | `appgprj_6ac59f72cb7881918238960fa462ddf8` |
| Custom-domain binding | `appgdom_6ac98e8b608081918184c990459d1284` |
| Cloudflare zone | `4467476bfd1ad6c289c9ddf610859efb` |
| Apex A targets supplied by Sites | `162.159.143.30`, `172.66.3.26`; DNS-only; TTL 300 |
| Ownership TXT names | `_openai-site-verification.easyman.app`, `_cf-custom-hostname.easyman.app` |
| Native scheduler | `easyman-snapshot-scheduler`, separate Worker in the owner's Cloudflare account |

Sites hosts the application and its database. The scheduler calls that existing application; it does not maintain another property database. Feedback and scheduler credentials belong in their service environments, never DNS or source.

For routing/sign-in problems, use the original managed address to diagnose the same project. Re-read domain/DNS configuration before changing it. For code/data compatibility and deliberate example resets, follow [RECOVERY_AND_ROLLBACK.md](RECOVERY_AND_ROLLBACK.md). Native health and catch-up details are in [SNAPSHOT_OPERATIONS.md](SNAPSHOT_OPERATIONS.md).

## Remaining evidence gaps

Testing currently uses this computer, fictional records, isolated synthetic identities and a simulated PMS report. Another real account/administrator, actual phone/tablet, actual PMS/approved-LLM conversion and hotel staff workflow feedback are unavailable or unverified. They are evidence gaps to state when judging readiness, not permission to reduce the intended product or invent customer obligations. The checklist records which useful validation can proceed locally now and which hosted/device checks remain deferred.

## First fix batch — local checks

The first fixes resolve review IDs **1, 2, 5, 7 and 8**. A complete **84-test** run and type/build checks passed, using actual storage handlers with isolated synthetic identities. In a local device-only browser workspace, a date-range restriction with shift/position qualifiers survived name/consent edits and reload; structured date/shift/position controls then changed the range end and persisted it. This browser check is separate from hosted cloud-save and multi-user checks. Reassignment/readback, old scope/history, narrow cloud saves, publish escalation/tampering and revoked recovery approval were tested through the isolated handlers. No hosted records were reset. Existing native/domain observations remain historical evidence.

## Second fix batch — local housekeeping and room checks

The second batch resolves review IDs **3, 4 and 14**. All **90 tests**, type checks and the deployment build passed. Synthetic encrypted scoped recipients and actual storage readback verified task service with the daily plan withheld and encrypted roster persistence. The device-only browser imported six fictional departures/stayovers, selected three attendants and obtained 3/3/2.25 workload points. Removing an attendant after the explicit lock-release warning, rebalancing and reloading retained the two-person roster and cleaning progress. Add room verified suite/queen defaults and deliberate override/reset controls; a fictional suite persisted its 2-point score after confirmed save/reload. No hosted example records were reset.

The first rapid new-room reload exposed a save-indicator race: Saved remained visible during the pre-save delay. That observation was corrected, not recorded as a successful persistence check. Saving now appears immediately, stale queued completion cannot clear newer pending work, and a before-leaving handler warns while saves are pending. The browser verified immediate Saving securely and later successful persistence. The native leave-warning dialog itself was not separately exercised in this check. Those remaining findings and C1/C2 are now completed in the final batch below.

## Final corrective batch — October 10, 2026

The complete suite passes **99/99 tests**, TypeScript checks and the deployment build. New focused cases cover protected full/partial coverage, feasible 8/40-hour allocation, hour/rest override acknowledgment, custom-time constraints/XLSX, real capability/scope exports, inspection details/rechecks/all filters, acknowledgment revisions and frozen snapshot rendering. An actual encrypted storage/readback test preserves custom schedule fields, inspection attendant/category, acknowledgment/history and captured owner/note details. Local browser checks saved/reloaded custom times with a deliberate weekly-limit override, separate inspection/recheck/filter history and an unrelated discipline edit retaining Acknowledged. Tests use fictional records and isolated identities; no hosted examples were reset.

Browser evidence: pending warning rejection; adjusted shift and override reason after save/reload; separate failed inspection/passing recheck with attendant/category/history filters; subject-only discipline revision retaining Acknowledged after reload. Scoped export behavior, frozen snapshot content and protected generation are isolated synthetic tests rather than real hosted-team checks. No official 1.0 tag or public audience change was made.
