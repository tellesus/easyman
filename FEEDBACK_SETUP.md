# Enable EasyMan feedback

Destination: **tellesus/easyman-feedback**. Private visibility, GitHub App permissions and installation were verified on October 9, 2026. All four hosted values are configured; the private key is stored as a server secret. The live EasyMan form successfully created synthetic Issue #1. Bug and Feature Request checks used the actual handler with an isolated test database and created Issues #2 and #3; repeating those feedback IDs returned the same issue numbers without making another GitHub request. All three labels were verified and the synthetic issues were closed. No hotel records were used.

## Create the GitHub App

1. While signed into GitHub as **tellesus**, open [New GitHub App](https://github.com/settings/apps/new).
2. Give it a unique name, such as **EasyMan Feedback tellesus**. Set Homepage URL to `https://easyman-hotel-ops.michaelleza.chatgpt.site/`. No callback URL or user authorization is needed for this installation-token integration. Leave device flow and user authorization during installation off.
3. Under Webhook, turn **Active** off. EasyMan does not receive GitHub webhooks.
4. Under Repository permissions, set **Issues: Read and write**. Metadata read access is supplied by GitHub. Leave other repository, organization and account permissions at No access. Select **Only on this account** and create the App.
5. On the App's registration settings page, look in **About**: **Client ID** is displayed as plain text below **App ID**, and may have no copy button. Select and copy that text. GitHub also accepts the numeric App ID as the JWT issuer, so the existing `GITHUB_APP_CLIENT_ID` setting can use an App ID if needed. Under Private keys, click **Generate a private key** and retain the downloaded `.pem` file locally.
6. Choose **Install App**, install it on **tellesus**, choose **Only select repositories**, and select **easyman-feedback**. Do not select the public source repository. The numeric **installation ID** is the final number in the installation settings URL, for example `https://github.com/settings/installations/12345678`. It is different from both the App ID and the GitHub account/user ID. If uncertain, the App-authenticated `GET /repos/tellesus/easyman-feedback/installation` endpoint returns the correct installation ID.
7. Check that [the feedback repository](https://github.com/tellesus/easyman-feedback) still has private visibility, **Issues** enabled, and is not archived.

Send me the Client ID, installation ID, and the local path of the downloaded PEM file. **Do not paste the private key in chat.** I can read that specifically identified file and configure the hosted server secret without printing or committing its contents. Alternatively, add the following values through the Site's server environment settings yourself.

| Server value | Value | Secret |
| --- | --- | --- |
| `GITHUB_FEEDBACK_REPOSITORY` | `tellesus/easyman-feedback` — already set | No |
| `GITHUB_APP_CLIENT_ID` | Client ID from the App settings | No |
| `GITHUB_INSTALLATION_ID` | Numeric installation ID | No |
| `GITHUB_APP_PRIVATE_KEY` | Full downloaded PEM contents, including header, footer and actual line breaks | Yes |

This integration does not need a personal access token, GitHub password, OAuth client secret, or webhook secret. The GitHub connector used to edit the source repository is separate from the GitHub App used by the running EasyMan Site.

## Verify after configuration

After changing credentials, verify a clearly marked synthetic submission through EasyMan and check the issue and its category label in the private repository. The three labels are `pain-point`, `bug` and `enhancement`; EasyMan creates a missing category label automatically. The initial live check is complete, as recorded above. Confirmed-retry behavior also passed the actual-handler checks against the live repository.

Each issue contains only the reviewed subject and description, category, EasyMan version, submission time, module and feedback ID. No hotel records or account email are added automatically. Users should leave confidential information out of the text they compose. Drafts remain encrypted in EasyMan after a failed submission.

If GitHub's response is ambiguous, EasyMan blocks blind retries. A developer must search the private issues for the **Feedback ID** before deciding whether the submission exists. The Copy feedback text button includes that ID. A normal confirmed retry returns the original issue number without creating another issue.

## GitHub references

- [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [Managing private keys](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps)
- [JWT issuer: Client ID or App ID](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app)
- [Installing a GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)

Feedback is configured for private 1.0.0. Keep its destination private and all credentials in the hosted server environment. See IMPLEMENTATION.md and RELEASE_NOTES.md for validation and deferred checks.
