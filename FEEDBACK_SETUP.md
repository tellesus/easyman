# Enable EasyMan feedback

Destination: **tellesus/easyman-feedback**. Its private visibility was verified on October 9, 2026, and the hosted Site's `GITHUB_FEEDBACK_REPOSITORY` is already configured. The app code is ready; submissions stay unavailable until its GitHub App credentials are added.

## Create the GitHub App

1. While signed into GitHub as **tellesus**, open [New GitHub App](https://github.com/settings/apps/new).
2. Give it a unique name, such as **EasyMan Feedback tellesus**. Set Homepage URL to `https://easyman-hotel-ops.michaelleza.chatgpt.site/`. No callback URL or user authorization is needed for this installation-token integration. Leave device flow and user authorization during installation off.
3. Under Webhook, turn **Active** off. EasyMan does not receive GitHub webhooks.
4. Under Repository permissions, set **Issues: Read and write**. Metadata read access is supplied by GitHub. Leave other repository, organization and account permissions at No access. Select **Only on this account** and create the App.
5. On its settings page, copy the **Client ID**. Under Private keys, click **Generate a private key** and retain the downloaded `.pem` file locally.
6. Choose **Install App**, install it on **tellesus**, choose **Only select repositories**, and select **easyman-feedback**. Do not select the public source repository. The numeric **installation ID** is the final number in the installation settings URL, for example `https://github.com/settings/installations/12345678`.
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

I will submit clearly marked synthetic feedback through EasyMan, check the issue and its category label in the private repository, and retry the same feedback ID to confirm that only one issue exists. The three labels are `pain-point`, `bug` and `enhancement`; EasyMan creates a missing category label automatically. The real submission check is still pending.

Each issue contains only the reviewed subject and description, category, EasyMan version, submission time, module and feedback ID. No hotel records or account email are added automatically. Users should leave confidential information out of the text they compose. Drafts remain encrypted in EasyMan after a failed submission.

If GitHub's response is ambiguous, EasyMan blocks blind retries. A developer must search the private issues for the **Feedback ID** before deciding whether the submission exists. The Copy feedback text button includes that ID. A normal confirmed retry returns the original issue number without creating another issue.

## GitHub references

- [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [Managing private keys](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps)
- [Installing a GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)

The 1.0 release remains held while this setup and the other acceptance checks in `IMPLEMENTATION.md` are outstanding.
