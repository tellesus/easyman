# EasyMan recovery and rollback

EasyMan is intended for reliable live hotel operations. It is currently under development and testing at `https://easyman.app/`, with fictional data and no customers. The `1.0.0` package value identifies the current build; it does not certify an official release or completion of recovery/security acceptance. See [CURRENT_SPEC.md](CURRENT_SPEC.md), [KNOWN_ISSUES.md](KNOWN_ISSUES.md) and [ROADMAP.md](ROADMAP.md).

The procedures below describe the implemented recovery/backup paths and the intended protection of records during eventual live use. For current development, incompatible examples may be reset and regenerated instead of adding migration work solely to preserve them. A deliberate data reset is different from a code rollback or a recovery test. There is no new reset action introduced by this guide, and this documentation update does not reset data.

## Recovery and backup files

| File | Where to create it | What it restores |
| --- | --- | --- |
| Account recovery file | Account options → Download recovery file | Your account's decryption key in another browser. It does not back up property records. |
| Encrypted working copy | Property settings → Backups & security → Export encrypted working copy | Records available to your account, including saved history and dated housekeeping plans. It is not a full server/database backup. |
| Encrypted configuration backup | Property settings → Backups & security → Export configuration backup | Property settings, departments, positions, shifts and room-type configuration. It excludes operational/personnel records. |

For records that need to be retained, keep recovery/backup files in protected storage outside the working browser and passphrases separately. Keep a known-good copy before a bulk import, recovery or major configuration change. These exports are manual; shift snapshots are historical handover records and do not create account-recovery, configuration or working-copy backups. Automated full backup or disaster-recovery guarantees are not established by these features.

During recovery testing, retain a working account key until the recovery file has opened the intended records in another browser. If the purpose is instead to replace disposable incompatible examples, record that reset and generate data that follows the corrected standard. In either case, keep private keys, passphrases and hosting credentials out of chat, source, GitHub and feedback issues.

## Open an existing account in another browser

1. Keep the original browser available and confirm Encrypted · saved.
2. Export an account recovery file from Account options using a passphrase chosen in the app.
3. Open EasyMan and sign in with the same account in the other browser.
4. If recovery is requested, choose the account recovery file and enter its passphrase.
5. Confirm the intended property and records open, then reload and check again. Wrong files/passphrases must not replace the stored key.

An account recovery file is different from a configuration backup or working copy. Legacy device-key controls are not a substitute for account recovery. The server cannot reconstruct plaintext if all authorized decryption keys and recovery files are lost.

Known issue **8** is fixed and verified with isolated synthetic identities: listing/approving recovery requires an active application session, revoked sessions are rejected without changing the ticket/key, and unknown actions are rejected. Recovery-request bootstrap remains available without a working app session. Valid approval after starting a new session was also checked. A real hosted second-administrator/key-provisioning flow remains untested; the sample access-profile preview cannot establish it.

## Restore an encrypted working copy

1. If the current test state is useful, export it before testing an older copy; when preserving operational records in eventual live use, retain a current recovery point.
2. Open Property settings → Backups & security → Restore encrypted working copy.
3. Choose the file, enter its passphrase and select Decrypt & preview.
4. Check the property, employee and record counts. Cancel if the file or target property is wrong.
5. Confirm restore, wait for Encrypted · saved, then reload.
6. Check pass-ons, schedule/draft status, publication history, employee records and each relevant housekeeping date. Export a board to verify its selected date and assignments.

The implemented restore is a merge, not a complete database rewind. Matching records are restored and newer unrelated records are retained. Room/date identity prevents duplicate housekeeping tasks; restored daily plans determine which tasks are active. Existing snapshot/publication archives are retained. Replaced coaching/discipline content retains its previous content as a revision. Restoration is intended to return affected schedules to draft while retaining publication history; publication/editing defects elsewhere in the current implementation are recorded as fixed and locally verified in known issues **5** and **7**. Continue verifying affected combinations; those checks do not establish every permission/history scenario.

Configuration restoration is separate: Restore from backup → preview → confirm. Review referenced departments, positions, shifts and room types. Changed shift definitions/time zone are intended to draft affected schedules while the publication archive retains its original times. Scope and permission combinations belong in the verification checklist as the related defects are fixed.

## Recover from a code or domain failure

- A sync conflict means another session changed the workspace. Preserve any needed local working copy and reload before editing. Repeated stale writes are not a conflict-resolution procedure.
- For a domain-only problem, the original address is `https://easyman-hotel-ops.michaelleza.chatgpt.site/`. Both addresses use the same application and stored records. Changing origin does not undo data changes and may require account recovery in that browser.
- For a code regression, select a verified compatible saved Sites version on the existing project. Check its schema, encrypted-record format, native scheduler endpoint and environment requirements before redeploying. A successful old deployment is not proof that it accepts today's data or scheduler requests.
- Preserve intended private sharing, feedback credentials and native scheduler configuration during a code-only rollback. Recreating the project or changing DNS is not a normal code rollback.
- Pause the native scheduler's cron if the selected app version lacks a compatible endpoint/schema. Resume after restoring a compatible version and verify a real scheduled invocation. Browser catch-up does not replace native scheduling.
- A deployment rollback changes code, not stored records. Review the resulting state. During this development stage, incompatible fictional records may be reset and replaced with current examples. Do not require legacy backfills solely to retain them; do not mistake authorization to replace examples for a need to destroy the repository, hosting project or credentials.

## Historical deployment references

Sites project: `appgprj_6ac59f72cb7881918238960fa462ddf8`.

| Reference | Saved version | Source revision | Interpretation |
| --- | --- | --- | --- |
| Reviewed native scheduler + 12-hour cutoff build, October 10, 2026 | `appgprj_6ac59f72cb7881918238960fa462ddf8~appgver_1d0d3f40b7e08191a0ffa79109c4bb3a` | `7e283d3617701c7379dc63ed47c58bb5c67fba65` | Application baseline for the review, with known defects still open. |
| Earlier 0.2 development build, October 10, 2026 | `appgprj_6ac59f72cb7881918238960fa462ddf8~appgver_4c44a0ae743081918d569c6b7775da3c` | `2d16d065476c198d46fb4bc7cb5e87b408080dd8` | Historical reference only; predates later backup/publication fixes, native scheduling and cutoff metadata. |

Neither reference is a blanket recommendation to roll back. Determine compatibility for the actual failure and current data standard. A source tag, if one exists, should continue to identify its original commit rather than being moved to disguise a rollback. These references do not assert that an official 1.0 release/tag exists.

## Verification and support

Use fictional records for the current checklist and isolated account/session tests on this computer. No team or real PMS export is presently available. Real-account invitation/recovery and device checks that have not been exercised must remain explicitly unverified; they do not require inventing a live property or customers. The intended access and recovery behavior still needs evidence before release.

Submit bugs through EasyMan's feedback form to the private feedback repository. Include build version, steps, expected/actual behavior and relevant property time zone; avoid unnecessary guest/employee information. For an ambiguous submission, keep the Feedback ID so the repository can be checked before retrying. See [FEEDBACK_SETUP.md](FEEDBACK_SETUP.md) and [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md).

## Public website routing update

The brochure is public at `https://easyman.app/`; open the authenticated workspace at **https://easyman.app/app** for the procedures in this guide. Website visibility does not grant property access. Keys, database, recovery and signed native snapshot endpoints are unchanged. See [WEBSITE.md](WEBSITE.md).
