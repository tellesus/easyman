# EasyMan interactive demo

October 11 scheduling extension: the shared demo includes daily staffing grids/defaults/weekly overrides, overnight eligibility, gap decisions and Manager commitments, warning acknowledgment, publication history and the Staffing needs XLSX sheet. These use the same memory-only runtime; no operational requests or persistent browser writes are added. See [SCHEDULING_GUIDE.md](SCHEDULING_GUIDE.md). The original 107-test verification below predates this extension.

The owner-approved public playground is **https://demo.easyman.app/**. The product website is **https://easyman.app/** and registered-user access remains **https://easyman.app/app**. The demo is a fictional hotel, not a public shared property or a customer-service launch.

## Behavior

- No login. The demo acts as a fictional manager and shows a persistent fictional/temporary-data banner, website/sign-in links and a Reset demo control with confirmation.
- A fresh, independent in-memory state is created for each page/tab. Changes survive moving between modules. Reset, refresh and a return from browser back-cache start fresh; no hotel records, keys, authentication or browser storage are imported.
- Real shared domain logic supports schedule drafts, shift edits/publication history, daily housekeeping roster/service/progress/kept assignments/rebalancing, room checks/rechecks, employee profiles, personnel records and pass-ons. Demo status text explicitly says data is temporary, not cloud-saved.
- Three Things to try actions open scheduling, housekeeping and pass-ons. Prepared data is dated dynamically and includes a populated current-week schedule, a dated daily roster/board, a DND hold, leading-zero room 007, useful inspection/personnel examples and pass-ons with notes/history.
- XLSX exports are actual files containing the demo data. Housekeeping setup offers fictional PMS-report and prepared-JSON downloads, direct example loading and a mapping issue requiring review. Normal validation and explicit application are retained.
- Account recovery, invitations, session administration and persistent backups are unavailable with explanations. Feedback supports a temporary draft/preview; it never submits to GitHub. Snapshots are labeled fictional examples, use the normal 12-hour completion rule and preserve frozen notes; no scheduler runs in this demo.

## Separation from the registered app

The existing app passes no demo runtime and keeps its existing loading, encryption, IndexedDB, server sync, recovery, membership/action/scope enforcement, real feedback and native background snapshots. Public demo hosting is a different Site and browser origin, with **no D1/R2 binding, environment variables, connector/MCP capability or server/API routes**. The root Site/database/domain and native scheduler configuration are unchanged.

`app/workspace.tsx` accepts an explicit `DemoRuntime`. `app/demo-state.ts` loads/clones/saves only memory; it ignores any supplied account context in demo mode. `app/demo-ui.tsx` and `demo/demo-app.tsx` provide the temporary controls and explanations. Crypto helpers are in `app/vault-crypto.ts`; `app/vault.ts` preserves the existing exports and device-store behavior for the real app.

The static build replaces live storage/account modules with fail-fast stubs. Its input graph excludes the real vault, team client/panel, server identity and API modules. Content Security Policy uses `connect-src 'none'`, `worker-src 'none'` and `form-action 'none'`, while allowing its own scripts/styles and local downloads. The build rejects persistent browser-storage references in its output. ExcelJS's bundled browser deprecation-warning preferences use their default behavior without localStorage in the demo build only; the normal app dependency is unchanged. A dependency change that invalidates that guarded transformation fails the demo build for review.

## Build and publish

The committed `demo/site.json` records the actual registered demo identity and URLs. The root `.openai/hosting.json` always belongs to the real app; do not replace it with the demo identity or add demo storage bindings.

From the main repository, `npm run build:demo` builds a separate local artifact under `.sites-runtime/demo-preview`. `scripts/prepare-demo-site.mjs <absolute-demo-checkout>` copies a sanitized frontend source snapshot into the registered demo checkout, preserving its static hosting manifest. Build that checkout with `node scripts/build-demo.mjs dist`, then use the Sites source/version/deployment workflow for that exact demo project. Its source snapshot includes shared frontend source, dependency manifests/lockfile, build script and retained licenses. Generated output is excluded from its source Git commits and supplied as the deployment archive. The builder refuses to overwrite the real app's bound `dist` directory.

The checkout-local author path is `.sites-runtime/demo-site`; this and Windows packaging adaptations are ignored local tooling, not product runtime dependencies. The demo is public, so use the general save/deploy operation. Update the main app/website through its own public Site workflow. Deploy and verify the demo before changing links. Source and license offers point to [tellesus/easyman](https://github.com/tellesus/easyman); original material remains AGPL-3.0-only.

## Verification

The complete suite passes **107/107 tests**, including memory isolation/reset, current populated data, frozen cutoff/examples, valid/ambiguous import files, real XLSX contents and static build separation. Existing scheduling/encryption/access/API/recovery/native-snapshot regressions pass. TypeScript also passes.

Local browser testing uses a test-only probe that throws/counts network and storage API access. It is **not included in the public artifact**. Schedule generation/publication and a real XLSX download work; after the dependency guard, the download records zero network/storage API attempts. Browser checks also exercise kept housekeeping assignments, cleaning/rebalancing, ambiguous-import rejection, valid import application, pass-on completion/frozen history, property-name changes, reset and refresh. All records are fictional; the real hosted property is not reset or copied.

These checks establish the exercised demo scenarios and the existing app regressions. They are not evidence of real-team, phone/tablet or actual PMS/LLM testing, and they do not certify demo role previews as real account security.
