# Public website and signed-in app

Owner-approved update: a professional public introduction at **https://easyman.app/**, with a separate playable demo to follow after the website is reviewed. This updates the product specification; it does not announce an official 1.0 release or customer availability.

- `/`: public landing page with features, illustrated fictional workflow previews, PMS-file preparation and spreadsheet export explanations, scope, privacy/key recovery, FAQs, development status and source/license links.
- `/app`: authenticated workspace. Server-side sign-in is required before rendering the workspace. Existing property membership, action/scope checks, encryption, sessions, recovery and private feedback remain enforced by the application APIs.
- `/license`: AGPL-3.0-only notice, source offer, no-warranty statement and third-party notice guidance.
- Legacy `/?property=…`, `/?join=…` and `/#join=…` links forward to the app, preserving their reference. New invitations use `/app?join=…`; sign-in preserves the app/property/invitation path.

The hosting audience is public so visitors can read the brochure without sign-in. Hosting access and property authorization are distinct: public page access does not authorize reading another account's records. The landing page imports no hotel data, calls no operational API and stores no visitor form submissions. Its preview data is static fiction, not retrieved from the owner's property. No waitlist, contact collection, pricing, testimonials, customer statistics or live-customer claims are invented. The feedback readiness endpoint returns only a boolean; feedback submission and stored records remain authenticated.

The site uses the existing managed Site/custom domain; DNS, D1 data, secrets, native snapshot worker and Cron schedule are unchanged. `app/marketing.tsx` and `app/marketing.css` define the responsive presentation. Preserve the public brochure and authenticated app separation in subsequent deployment changes; do not use an owner-private deployment operation after making the Site public.

The next owner-planned step is an isolated public demo. The current feature preview is clearly labeled illustrative and the demo is marked forthcoming. It is not a simulated security/permission test or a public shared property.

## Verification

The full suite passes **101/101 tests** and TypeScript checks. New tests execute the actual public/app page routing with an anonymous identity, preserve encoded invitation/property returns and reject operational API reads/writes without sign-in. Feedback readiness is restricted to a boolean; submissions remain authenticated. Existing scope/session/disabled-account and native snapshot tests also pass. Browser QA checks desktop and 390px narrow layout, no horizontal page overflow, all three illustration tabs including arrow-key navigation, FAQ expansion and in-page anchors. These local checks use the standard simulated hosting identity; signed-out hosted access is checked separately after publication.
