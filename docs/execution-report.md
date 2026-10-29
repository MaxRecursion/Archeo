# Jev integration execution report

Latest handoff: the completed light/dark implementation, execution checkpoint and [step-by-step key setup guide](setup-keys.md) accompany the main-branch source. The latest local validation passed lint, strict types, 82 unit/integration tests (one optional paid live test skipped), production build and dependency audit. The full browser suite has 15 scenarios, including six theme scenarios. Independent light/dark desktop and 320px visual checks passed. Earlier deployment records below remain historical evidence; new deployments follow main through the existing Git integration.

28 October 2026, Asia/Kolkata. No credentials are included. Code and documentation are published; live paid inference remains blocked on account configuration.

## A. Executive summary

Implemented and deployed public-repository Change Impact Intelligence alongside the existing source-backed architecture explorer. A server-only official Jev adapter batches typed classification, impact and review questions. The public application currently uses clearly labeled deterministic demo decisions; live transport is tested with mocked HTTP, not a real TypeSafe account. Core repository analysis and the actual deployed demo workflow pass browser verification.

## B. Repository changes

- `MaxRecursion/Archeo`: feature commit `7528c2d500e07dc603d0f08692b43136c9c12460`, pushed to main. Added bounded comparison collection, official SDK adapter/questions, runtime schemas, review policy, protected API, evidence/uncertainty UI, evaluation fixtures, CI and setup/security/architecture documentation. Important paths: `lib/server/analysis/changeAnalysis.ts`, `lib/server/jev/`, `lib/server/routes/changeImpact.ts`, `src/lib/validation/changeImpact.ts`, `src/components/impact/ChangeImpactPanel.tsx`.
- `MaxRecursion/maxrecursion.dev`: portfolio commit `f330b4300dc3d2cf9ec53f743e62712ad7fc2b17`, pushed to main. Four files add a featured card, accurate typed-decision explanation, explicit mock disclosure, existing visual treatment and technical notes link.
- No changes to the parent AutoVerse repository. An independently authorized redesign chat was concurrently editing Archeo. Its work was preserved; feature validation/deployment used this isolated managed worktree. The redesign chat subsequently integrated the feature and owns its final design/DNS deployment. This report records the feature deployment specifically.
- Final combined main is `3a5cff4274bdac8b8dda5a9ca88ec6c4c4ddf1ec`: the redesign and Jev feature are now published together. The post-deployment verification below supplements the original isolated feature results.

## C. Jev integration

- Official `@typesafe-ai/sdk@0.7.0`, Node 22+, pinned `jev-1.14.0`, verified against [official SDK documentation](https://docs.typesafe.ai/sdk/javascript) and [model documentation](https://docs.typesafe.ai/models).
- One server-side request to the fixed official System One API contains Choice (eight categories), Score (continuous weighted 0–4 rubric), and Noul (probability review is warranted). Confidence is shown only for Choice/Score.
- GitHub public visibility is checked explicitly. Refs are resolved to commit SHAs before comparison. The server discards patches/source and sends at most 60 eligible public filename/status/count/signal records, at most 32 KiB of normalized state. Private repositories, generated artifacts and credential files are excluded.
- Live inference requires a separate operator bearer token and explicit metadata-sharing consent. The TypeSafe key stays server-side. Origin validation, timing-safe token comparison, 8-second upstream timeout, zero inference retries, 64 KiB upstream response cap, strict Zod validation and redacted errors are implemented.
- TypeScript review policy escalates high impact, sensitive paths, ambiguity, incomplete evidence and unavailable inference. It never approves/merges/blocks a PR. No vulnerability-scanning claim is made.
- A bounded actor/mode/model/evidence/version-specific warm-instance cache avoids duplicate decisions. Its instance limiter and cache are not distributed cost guarantees. No database or paid cache service was added.

## D. Test results

| Command | Result | Evidence |
| --- | --- | --- |
| `npm ci` | Pass | Clean isolated lockfile install; no vulnerabilities |
| `npm run lint` | Pass | ESLint |
| `npm run typecheck` | Pass | Strict TypeScript |
| `npm test` | Pass | 81 passed, one optional paid live smoke skipped, 11 test files |
| `npm run build` | Pass | TypeScript and production Vite bundle |
| `npm audit --audit-level=high` | Pass | Zero reported vulnerabilities |
| `PLAYWRIGHT_PORT=4180 npm run test:e2e` | Pass | 8/8 scenarios: existing graph flows plus demo/live controls, errors, fallback, evidence, keyboard/phone behavior |
| `npm run evaluate` | Pass | One evaluation test, ten labeled scenarios, full rows and metrics printed |
| `npm run test:live` | Not run | Requires authorized TypeSafe key/account; ordinary CI skips this test |
| `git diff --check` | Pass | No whitespace errors before feature commit |
| Portfolio `pnpm install --frozen-lockfile` | Pass | Existing pnpm lockfile |
| Portfolio `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, `pnpm audit --prod` | Pass | No portfolio unit suite exists; rendered browser smoke supplements build checks |

Baseline was clean at `c79a70d...`; 19 unit/integration tests and three E2E tests, lint, types and build all passed before edits. Concurrent redesign changes temporarily caused an unrelated icon import failure in the original checkout; the isolated feature baseline passed all checks and no design changes were reverted. [Feature CI run 40738025238](https://github.com/MaxRecursion/Archeo/actions/runs/40738025238) completed successfully, including all eight E2E tests.

The final combined [CI run 40738844085](https://github.com/MaxRecursion/Archeo/actions/runs/40738844085) also succeeded. Executed logs confirm **81 unit/integration tests passed, one optional paid live test skipped, and 9 browser tests passed**. The added design regression scenario supplements the original eight feature/browser tests.

Targeted tests cover exact batched request shape, distributions and malformed output, missing credentials, 401/402/403/429/529, timeout/no retry, redaction, input/response size bounds, unsafe origins/paths, private or malformed visibility, consent/operator authorization, cache identity and deterministic fallback. A staged-file token/private-key pattern scan found no hits; client assets omit provider API origin and server credential variable names. This is not a comprehensive secret-history audit or proof of security.

## E. Evaluation results

Ten synthetic scenarios were hand-labeled independently of predictions. Deterministic demo classification was 9/10 (90%); review 10/10 (100%), with TP6/TN4/FP0/FN0. The simpler documentation-only baseline classified 3/10 and got review right 8/10, TP6/TN2/FP2/FN0. The localized refactor demonstrates an unavoidable metadata ambiguity. These are tiny, non-held-out heuristic measurements, not Jev accuracy or calibration. See [evaluation.md](evaluation.md) and run `npm run evaluate` to reproduce every row.

## F. Deployment results

| Project | Environment | Deployment | Status |
| --- | --- | --- | --- |
| `max-recursion/archeo` | Preview | `dpl_VyH6LeTPB3iRgYGmihnDTxhV9c4D` — [preview](https://archeo-mrfx6o3h1-max-recursion.vercel.app) | READY; protected-preview HTTP checks passed |
| `max-recursion/archeo` | Production | `dpl_CwSnUezDQHT6v7GAijFeB6cSJ1E1` — [immutable deployment](https://archeo-114xbhg0k-max-recursion.vercel.app), [public app](https://archeo-sigma.vercel.app) | READY, feature commit `7528c2d...`; actual browser smoke passed |
| `max-recursion/archeo` | Verified redesign production | `dpl_5pG6nyfNTEoG4fVSjcxn99nzD7Qw` — [immutable deployment](https://archeo-ozwmzdjj7-max-recursion.vercel.app), [custom domain](https://archeo.maxrecursion.dev), [fallback](https://archeo-sigma.vercel.app) | READY, commit `3a5cff4...`; fresh actual browser verification passed |
| `max-recursion/maxrecursion-dev` | Preview | `dpl_A7KcuqQnGDrD2VWnNp2iR9tKs2gz` — [preview](https://maxrecursion-am1n1d14z-max-recursion.vercel.app) | READY; authenticated content checks passed |
| `max-recursion/maxrecursion-dev` | Production | `dpl_HKx5BQaCvzsVvSeP1oB6LRvsU59S` — [immutable deployment](https://maxrecursion-58abfwb66-max-recursion.vercel.app), [portfolio](https://maxrecursion.dev) | READY, commit `f330b43...`; actual production browser checks passed |

App preview checks: `/api/health`200, malformed comparison400, disabled live503, actual public five-file comparison200 with explicit mock model; observed630ms for that one request. Production Playwright used real `developit/mitt` analysis and its last two commits with **no intercepted HTTP**: graph and one-file comparison worked, mock provenance rendered, health200/validation400/live503, no page errors, no 1440/768/390px body/header overflow, and no provider credentials/SDK in client assets. Observed comparison621ms is a single smoke observation, not a benchmark. Runtime log queries found no error entries. Screenshot: `/tmp/archeo-production-demo.png`; replay: `node /tmp/archeo-live-smoke.mjs https://archeo-sigma.vercel.app`.

The custom subdomain was NXDOMAIN during the original feature check. The redesign chat subsequently saved the authorized CNAME. Fresh Google and Cloudflare DNS-over-HTTPS queries now return that CNAME and Vercel A records. This execution host's native DNS resolver still returns ENOTFOUND. With a public-DNS-returned Vercel IP pinned for name resolution, custom-domain homepage/favicon/health all return200 and normal TLS certificate verification succeeds (no insecure flag).

Fresh actual Chromium smoke passed on the latest combined deployment at both the public Vercel alias and custom domain. For the custom-domain run only, Chromium name resolution mapped the domain to that observed IP; **no HTTP interception or TLS bypass** was used. Real `developit/mitt` graph and change evidence, explicit mock label, health200/validation400/live503, 1440/768/390px layouts, client assets and zero page errors all passed. Replay under the observed resolver-cache condition: `ARCHEO_SMOKE_IP=216.198.79.1 node /tmp/archeo-live-smoke.mjs https://archeo.maxrecursion.dev`. This IP is an observation, not a permanent DNS configuration recommendation. Use the fallback URL if the local network still caches the former negative answer.

## G. Portfolio results

[Projects section](https://maxrecursion.dev/#projects) contains the featured Codebase Archaeologist entry, Choice/Score/Noul explanation, mock disclosure and the existing cards. Demo link targets the verified app alias. [Public source](https://github.com/MaxRecursion/Archeo) and [technical notes](https://github.com/MaxRecursion/Archeo/blob/main/docs/jev-integration.md) resolve correctly. Actual production verification passed with `node /tmp/portfolio-smoke.mjs https://maxrecursion.dev` and `node /tmp/portfolio-production-check.mjs`: 1440/768/390px widths, no overflow/page errors, tablet requests and keyboard demo→source→technical order, retained metadata/canonical. Homepage and `/llms.txt` return200 and include the entry. All three featured targets return200. No portfolio-specific action remains; remote main matches the commit and working tree is clean.

Read-only portfolio re-verification after final Archeo redesign also passed: one intended featured entry and explicit mock disclosure rendered, no browser page errors, and demo/source/technical targets all return200. The existing fallback demo link remains valid, so no further portfolio mutation was needed.

## H. Required manual actions

Only live Jev activation requires the owner: sign in at [TypeSafe console](https://console.typesafe.ai/), verify account/organization access and credits, and create an API key. Any credit purchase requires separate owner approval; no payment was made. Add `TYPESAFE_API_KEY` and a random `CHANGE_IMPACT_ACCESS_TOKEN` (at least 32 characters) to the existing Vercel project through secure environment prompts/settings. Never paste either secret into chat or source. Optionally set `TYPESAFE_MODEL=jev-1.14.0`, configure preview separately if desired, and redeploy. Full official setup links and known/unverified account constraints are in [jev-integration.md](jev-integration.md).

## I. Known limitations

No live Jev account response, billing or model-quality measurement has been verified. Fresh environment inspection still finds no Vercel project variables or local TypeSafe/operator configuration. The public demo is deterministic. Change evidence is metadata-only and cannot establish semantic behavior, transitive impact, correctness or vulnerabilities. Private repositories and PR-number input are unsupported; branches/commits in one public repository are supported. Large/excluded/renamed/divergent comparisons are marked incomplete. GitHub anonymous quotas are shared; a least-privilege server token remains optional. Caches and limits are ephemeral. Custom-domain public DNS and TLS routing are verified, but this host's native negative DNS cache still requires the documented fallback or temporary test mapping.

## J. Smallest next steps

Configure the two live secrets, verify organization credits/access without unapproved purchases, then explicitly run `npm run test:live` with synthetic metadata and one consented operator request. Record actual model, latency and usage before claiming live Jev operation. Preserve the current safe demo if account access remains unavailable.
