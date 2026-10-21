# EasyMan accounts and staff approval

Updated October 20, 2026. Current testing uses fictional people and property records. The account system is intended for real hotel use.

## Create a login

Open **https://easyman.app/login**, choose **Create a login**, and enter your name, email and a password/passphrase. ChatGPT is not required. Use 15–128 characters; spaces and password managers work. Common passwords are rejected. There is no scheduled password-expiration or mandatory periodic-reset rule.

Save the login recovery file/code shown after registration. It can recover a forgotten password and the same encryption identity. The code is a secret; share only the separate **account request code** with your manager.

New accounts see **Waiting for approval and role assignment**, no property records, no administrator privileges and no new property setup. This also applies to new ChatGPT identities. Existing established owner access is preserved.

## Approve a staff member

1. In **Team & sessions**, enter the account request code supplied by the person. Alternatively, create an email-specific invitation link and share it directly. Creating an invitation does not send email or approve access.
2. Confirm the person through the hotel's usual process. Email ownership is not automatically verified by a mail service; matching an email never automatically links accounts or employees.
3. Choose **Configure access**, associate an active employee record, and select **Housekeeping staff**, **Front desk**, or **Schedule only**. Adjust board scope, shift-log access and own published-schedule access explicitly.
4. Choose **Approve association & access**. The application provisions authorized current/historical record keys. The person checks approval status and opens the approved property.

Staff profiles provide read-only assigned/all approved housekeeping boards, optional front-desk log reading/creation/updates, and the employee's own published schedule copies. They do not include live drafts, other employees' schedules, availability/preferences, coaching/discipline, export, employee management, settings or team administration. Published-only users never receive live draft keys. People without accounts remain ordinary employee records.

Managers with property-wide team authority can assign only permissions within their own authority. Full administrator grants remain administrator-only. A staff account cannot approve itself. An employee cannot be associated with two active accounts in one property. Disabling access immediately blocks property API access and revokes property sessions; previously viewed information cannot be erased from someone's memory or exported copies.

## Sign-in, password changes and recovery

Email/password sign-in unlocks a password-encrypted copy of the same account key on another browser, so a separate ChatGPT login or manual key-file import is not needed. A new browser can then read only records the property authorized. The server stores salted scrypt verifiers and encrypted key envelopes; it receives the submitted password over TLS during authentication. This is encrypted-at-rest/browser encryption, not a claim of zero knowledge against the authentication service.

Under **My account** or **Account options**, voluntary password changes require the current password, re-encrypt the same account key and invalidate other login/property sessions. Reload afterward for a fresh property session; successful password authentication clears stale property-session cookies. Recovery uses the saved login recovery code; a successful recovery replaces the code and invalidates older sessions without changing property membership or role.

If both password and login recovery code are lost, an administrator must verify the person, disable the old account and approve/link a replacement account, with authorized key provisioning. Knowing an email alone does not reset an account. Existing ChatGPT accounts retain their separate passphrase-encrypted account-key files and administrator-assisted key recovery.

Password accounts cannot use the older ChatGPT key-replacement route: replacing only the public identity would leave the password/recovery envelopes pointing to a different key. The server rejects both such requests and approval of such a ticket, preserving the password account's identity.

## Implementation and validation

- Password verification: pinned `@noble/hashes` scrypt, N=32768, r=8, p=3, 32-byte output, independent random salt. This follows a memory/CPU configuration listed in [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Verification uses the platform's timing-safe comparison. A per-isolate capacity guard bounds KDF memory; database IP/account throttles are authoritative across isolates.
- Login cookies: random 256-bit tokens, only SHA-256 token hashes stored, HttpOnly, SameSite=Lax, Secure on HTTPS, 12-hour expiry, credential-version checks and revocation. Property sessions retain existing 12-hour lifetime and server-side membership checks. Password lifetime is independent of session lifetime.
- Public endpoints use bounded JSON, same-origin mutation checks, generic credential errors and database throttling. Neither passwords nor recovery codes are stored in plaintext or logged. Recovery codes are hashed server-side; private identity envelopes are AES-GCM encrypted with independent salts.
- Migration `0009_independent_accounts.sql` adds account/session/request tables. Existing hotel records and encryption identities are retained. Native Sites deployment applies packaged Drizzle migrations. The development database may need this new migration applied separately if earlier local tables were provisioned without a Wrangler migration ledger.
- Local/isolated tests exercise signup with zero access, approval/employee association, real encrypted readback, own published copies versus drafts, front-desk updates, delegation limits, disabling, new-browser key unlock, voluntary changes, recovery-code rotation and old-session replay denial. Browser checks use fabricated accounts; no real staff are enrolled as part of development.

The public demo remains an independent memory-only toy workspace. It does not create logins, send feedback, grant accounts or persist hotel data.

Validation on October 20: all 127 tests, TypeScript and main/demo builds pass. Deployed synthetic-account checks verified signup/sign-in, zero-access waiting, denied property access and logged-out replay. The synthetic account was not associated with any hosted employee. Real-team and physical-device checks remain deferred; see LIVE_TESTING.md.

