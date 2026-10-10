# EasyMan recovery and rollback

Applies to private EasyMan 1.0.0 at https://easyman.app/.

## Keep three separate files

| File | Where to create it | What it restores |
| --- | --- | --- |
| Account recovery file | Account options → Download recovery file | Your account's decryption key in another browser. It does not back up hotel records. |
| Encrypted working copy | Property settings → Backups & security → Export encrypted working copy | Records currently available to your account, including their saved history and dated housekeeping plans. |
| Encrypted configuration backup | Property settings → Backups & security → Export configuration backup | Property settings, departments, positions, shifts and room-type configuration. It excludes operational/personnel records. |

Keep the files outside the working browser in a protected location approved by your organization, with passphrases stored separately. Retain a known-good previous copy as well as the newest copy. Create working-copy/configuration backups before bulk imports, recovery or major configuration changes, and at the end of a workday containing changes. This is a manual process; the snapshot task does not create these backups.

Do not clear browser storage or remove the last working account key until a recovery file has successfully opened the same records in another browser. Keep private keys and passphrases out of chat, GitHub, feedback issues and source files.

## Open an existing account in another browser

1. Keep the original working browser available and confirm Encrypted · saved.
2. Export an account recovery file from Account options using a passphrase you choose in the app.
3. Open EasyMan and sign in with the same account in the other browser.
4. If recovery is requested, choose the account recovery file and enter its passphrase.
5. Confirm the same property and records open, then reload and check again. Wrong files/passphrases must not replace the stored key.

An account recovery file is different from a configuration backup or working copy. Legacy device-key controls are not a substitute for account recovery. A different full administrator can assist with account recovery/key provisioning when available; that real-person path remains deferred in this release. If every authorized key and recovery file is lost, the server cannot reconstruct the plaintext.

## Restore an encrypted working copy

1. Preserve a new working copy of the current workspace before restoring an older one.
2. Open Property settings → Backups & security → Restore encrypted working copy.
3. Choose the file, enter its passphrase and select Decrypt & preview.
4. Check the property, employee and record counts. Cancel if the file or target property is wrong.
5. Confirm restore, wait for Encrypted · saved, then reload.
6. Check pass-ons, schedule/draft status, publication history, employee records and each relevant housekeeping date. Export a board to verify its selected date and assignments.

Restoration is a merge, not a complete database rewind. Matching records are restored; newer unrelated records are retained. Room/date identity prevents duplicated housekeeping tasks, and a restored daily plan governs which tasks remain active. Existing immutable snapshots/publications are preserved. Replaced coaching/discipline content retains the previous content as a revision. Restored changes to the live schedule return affected weeks to draft; review before publishing again.

Configuration restoration is separate: Restore from backup → preview → confirm. Review referenced departments, positions, shifts and room types. Changed shift definitions/time zone draft affected schedules while publication history retains its original times.

## Recover from a code or domain failure

- A sync conflict means another session changed the workspace. Stop editing in the stale session; preserve its encrypted working copy and reload. Do not repeatedly retry stale writes.
- For a domain-only problem, the original address remains https://easyman-hotel-ops.michaelleza.chatgpt.site/. Both addresses share the same application and records; switching addresses does not undo data changes and may require account recovery for that browser origin.
- For a code regression, redeploy a verified earlier saved Sites version on the same project through the private deployment operation. Preserve its current sharing and the existing snapshot schedule/feedback secrets. Do not recreate the project or database, clear encryption keys, or change Cloudflare DNS for a code rollback.
- Review affected records after rollback. A deployment rollback changes code, not stored hotel data. Restore data deliberately from history or an encrypted copy when required.

### Last verified pre-1.0 fallback

Sites project: `appgprj_6ac59f72cb7881918238960fa462ddf8`.

Saved version: `appgprj_6ac59f72cb7881918238960fa462ddf8~appgver_4c44a0ae743081918d569c6b7775da3c`.

Source commit: `2d16d065476c198d46fb4bc7cb5e87b408080dd8`.

This 0.2 development build includes daily housekeeping imports, readable room-list headers and default initial-day balancing. It predates the 1.0 working-copy and shift-publication fixes. Its deployment succeeded on October 10, 2026. Use the exact saved version; never move the v1.0.0 source tag to represent a rollback.

## Support and remaining checks

Submit bugs through EasyMan's feedback form using invented examples when possible. Feedback is sent to the separate private repository. Include the visible app version, steps, expected/actual result and property time zone, with guest/employee details removed. For ambiguous submissions, retain the Feedback ID so the repository can be checked before retrying.

A broader rollout requires real-account invitation/scope tests, a different administrator's recovery test and actual device testing. Never mark those deferred cases as passed based on the local sample access-profile preview.
