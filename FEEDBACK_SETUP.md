# EasyMan feedback integration

EasyMan sends reviewed user feedback to the separate private repository **[tellesus/easyman-feedback](https://github.com/tellesus/easyman-feedback)** using a server-side GitHub App installation. This is an implemented application integration; normal submissions do not depend on a Codex/GitHub connector or an assistant being present.

The app is being developed for live hotel use, but the current hosted environment contains fictional test data and has no customers. The `1.0.0` build value is not a release sign-off. [CURRENT_SPEC.md](CURRENT_SPEC.md) defines the product requirements; [KNOWN_ISSUES.md](KNOWN_ISSUES.md) and [ROADMAP.md](ROADMAP.md) track remaining work.

## Configured state and historical verification

On October 9, 2026, the destination's private visibility, GitHub App permissions and installation were verified and all four hosted values were configured. The private key was stored as a server secret. The hosted EasyMan form created synthetic Issue #1. Bug and Feature Request checks used the actual handler with an isolated test database and created Issues #2 and #3; repeating those feedback IDs returned the original issue numbers without another GitHub request. Category labels were verified and the three synthetic issues were closed. No actual hotel records were used.

This evidence covers the tested submission paths at that time. It does not certify all app workflows or replace a new check after credential, installation or integration changes. Do not create a replacement GitHub App merely to follow this guide; the setup section is for maintenance or rebuilding the integration when needed.

## Configure or replace the GitHub App

1. While signed into the repository owner's GitHub account, open [New GitHub App](https://github.com/settings/apps/new).
2. Give it a unique name, such as **EasyMan Feedback tellesus**, and set Homepage URL to `https://easyman.app/`. This installation-token integration does not use callback URLs, device flow or user authorization during installation.
3. Turn Webhook **Active** off. EasyMan does not receive GitHub webhooks.
4. Set repository **Issues: Read and write**. GitHub supplies metadata read access. Leave other repository, organization and account permissions at No access. Select **Only on this account** and create the App.
5. In the registration settings' **About** section, **Client ID** appears as plain text below **App ID**; there may be no copy button. Select/copy the text. The JWT issuer can also be the numeric App ID, despite the existing environment setting's name `GITHUB_APP_CLIENT_ID`. Generate a private key and keep the downloaded `.pem` file in protected local storage.
6. Install the App on **tellesus**, choose **Only select repositories**, and select **easyman-feedback**. Do not grant it access to the public source repository. The numeric **installation ID** is the final number in its installation-settings URL. It differs from the App ID and GitHub account/user ID. The App-authenticated `GET /repos/tellesus/easyman-feedback/installation` endpoint can confirm it.
7. Verify that the destination repository remains private, has **Issues** enabled and is not archived.
8. Configure the following values in the Site's **server environment**. Do not paste the private key into chat, client-side configuration, source or a feedback issue.

| Server value | Value | Secret |
| --- | --- | --- |
| `GITHUB_FEEDBACK_REPOSITORY` | `tellesus/easyman-feedback` | No |
| `GITHUB_APP_CLIENT_ID` | Client ID, or App ID used as JWT issuer | No |
| `GITHUB_INSTALLATION_ID` | Numeric GitHub App installation ID | No |
| `GITHUB_APP_PRIVATE_KEY` | Full PEM, including header, footer and actual line breaks | Yes |

Keep snapshot scheduler secrets separate when editing the server environment. The integration does not require a personal access token, GitHub password, OAuth client secret or webhook secret. The development GitHub connector used to edit EasyMan source is separate from the GitHub App used by the running application.

## Verify and handle failures

After configuration or credential changes, submit explicitly synthetic feedback through EasyMan and verify the issue and expected category in the private repository. The three categories map to `pain-point`, `bug` and `enhancement`; the handler creates a missing category label. Close synthetic issues after verification and record which paths were actually exercised.

The issue contains the reviewed subject/description, category, EasyMan version, submission time, module and feedback ID. The implementation does not automatically attach hotel records or account email. People should review their own entered text for unnecessary confidential information before submitting. Failed submission drafts remain encrypted in EasyMan.

If GitHub's response is ambiguous, the application blocks blind retries. An authorized maintainer should search the private repository for the **Feedback ID** before deciding whether another submission is needed. The Copy feedback text button includes that ID. A confirmed retry returns the original issue number rather than creating a duplicate. Verify these behaviors when modifying the integration; the October 9 checks are historical evidence, not a permanent guarantee.

## GitHub references

- [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [Managing private keys](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps)
- [JWT issuer: Client ID or App ID](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app)
- [Installing a GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the implementation inventory and [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for the current checks. Keep the destination private and credentials in server-managed secrets during development and eventual live use.
