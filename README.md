# Codebase Archaeologist

**Understand any codebase. See how everything connects.**

Codebase Archaeologist reads a public GitHub repository at a pinned commit and turns supported JavaScript and TypeScript imports into an interactive, source-backed architecture map. Phase 1 is deterministic: imports are parsed from source, directory structure comes from repository paths, and unresolved imports remain explicit.

**Change Impact Intelligence** adds a bounded public GitHub comparison and optional self-hosted Laya decisions. The deployed public demo uses deterministic, simulated decisions; live Laya requires a running model server, operator access and consent. Real local inference is tested separately from deterministic demo evaluation.

Application: [archeo-sigma.vercel.app](https://archeo-sigma.vercel.app). Portfolio: [maxrecursion.dev](https://maxrecursion.dev/#projects).

## Phase 1 features

- Analyze a public GitHub repository by URL or `owner/repository` and branch.
- Resolve the branch once, then read the Git tree and blobs at its commit SHA.
- View project, module, file, npm package, Node built-in, and unresolved import nodes.
- Inspect static imports, re-exports, literal dynamic imports, CommonJS `require`, exported symbols, and evidence locations.
- Search the repository and graph, filter node kinds, collapse side panels, and switch between overview and file detail.
- Browse source and manifests at the pinned commit, export the visible graph as SVG, and clear page state.
- Run the sample repository through the same API and analyzer as user input.
- Switch between light and dark mode; the initial appearance follows your device, and an explicit selection is saved across visits.

### Laya change assessment

- Open **Change impact** in the workspace and enter a base and head branch or commit from the same public repository.
- The server checks public visibility, pins both refs and collects up to 60 eligible filename/status/line-count records, excluding generated artifacts, lockfiles and credential files.
- **Choice** classifies the change into eight documented categories, including `other_or_unclear`.
- **Score** estimates potential impact as a continuous probability-weighted position on a five-level 0–4 rubric. It is not a severity percentage.
- **Noul** returns the probability that human review is warranted. It has no separate confidence field. Choice and Score confidence are shown separately from their distributions.
- All three independent questions share one native Laya HTTP request. Ordinary TypeScript applies the review policy, validates responses and retains deterministic evidence if Laya fails.
- The free demo uses the same evidence and UI with explicitly simulated decisions. Its figures are not live Laya probabilities or evaluation results.
- Laya receives public metadata only. It does not read the repository, build the graph, run tests, detect vulnerabilities or generate explanatory prose. The comparison does not currently use semantic diffs or compute transitive dependency impact.

For a reproducible comparison, analyze `MaxRecursion/Archeo` on `main`, then compare base `d91b9dec67bf929886225329c548c8104c5de3bd` with head `c79a70d7c4eae5800326dadb3459f0cf30574e85`. These are public pre-integration commits. Comparing `main` with its current commit gives an empty result; choose an earlier base to see changed files.

### Supported inputs and limits

- Public GitHub repositories only. GitHub URLs must use `https://github.com/owner/repository`; `owner/repository` also works.
- JavaScript (`.js`, `.jsx`) and TypeScript (`.ts`, `.tsx`) static syntax. Root `tsconfig.json` and `jsconfig.json` `baseUrl`/`paths` aliases are supported when their targets are in the analyzed source set.
- Vite, React, Vue, Svelte, Angular, Next.js, Remix, Express, and Fastify are detected only when named in a package manifest.
- No runtime call graph, semantic TypeScript checking, package installation, source execution or private repository support. Laya judgments are optional, probabilistic and explicitly distinguished from deterministic graph evidence.
- Large trees and files can produce a clearly marked partial result. The current centralized budgets are documented in [docs/SECURITY.md](docs/SECURITY.md).
- SVG export is implemented. PNG export is not included in Phase 1.

## Stack and layout

- React 19, Vite 8, strict TypeScript, React Router, Tailwind CSS 4, shadcn-style local UI primitives, Lucide, React Flow, Zod, and highlight.js.
- One Vercel Node.js Function in `/api/router.ts` dispatches four API routes; deterministic GitHub/source analysis and the self-hosted Laya HTTP adapter live in `lib/server`; client-safe schemas and graph transforms live in `src/lib`.
- No database, user accounts or persistent analysis storage. Optional live inference has operator bearer authorization; graph analysis and the demo need no secrets.

## Local development

Requires Node.js 22+ and npm (verified locally with Node 22.22.2/npm 10.9.7; Vercel uses Node 24). The optional Laya model service requires Python 3.12+.

```sh
npm ci
npm run dev
```

The Vite development middleware serves the same `/api/analyze` and `/api/source` handlers as Vercel. No secret is required. The public GitHub REST API applies its anonymous rate limit.

Commands:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npm run test:e2e
npm run evaluate
```

`npm run test:e2e` builds the production assets and runs Playwright against Vite Preview. The UI tests stub HTTP responses; analyzer integration tests mock GitHub and do not depend on live GitHub availability. To try the real sample, click **sindresorhus/is** on the landing page.

## Laya setup and environment

Laya replaces the hosted Jev integration. No TypeSafe account or API key is used.

Requires Node 22+ and Python 3.12+ for the separate model process.

```sh
npm ci
npm run laya:setup
npm run laya:serve
```

The first model start downloads the public Apache-2.0 typed-decisions checkpoint. Leave that terminal running. In a second terminal, create or edit ignored `.env.local` using `.env.example`, set a private `CHANGE_IMPACT_ACCESS_TOKEN` of at least 32 characters, then run `npm run dev`. Live requests need that operator password and explicit metadata-sharing consent. `LAYA_BASE_URL` defaults to loopback locally, `LAYA_MODEL` to `typed-decisions`. `GITHUB_TOKEN` is optional for higher public GitHub API quota. `LAYA_API_KEY` is optional for loopback inference and required for a remote model server. No `VITE_*` secret variables are used.

Run `npm run test:live` against the running model process for a real synthetic smoke test. Normal CI uses mocked HTTP and skips this test. The UI labels local/remote real inference **LIVE LAYA · SELF-HOSTED** and simulated outputs **DEMO**. Concentration is normalized entropy, not a probability of correctness. All live assessments conservatively recommend human review until domain evaluation/calibration is complete.

The model receives at most the first 12 eligible files, with a 4,096-token request budget and 512-token option budget. Server truncation is surfaced as incomplete evidence. See [full setup](docs/setup-keys.md) and [adapter details](docs/laya-integration.md).

## Vercel deployment

The existing `max-recursion/archeo` project builds this repository on pushes to main. The React UI and Node function run on Vercel; the Python model runs on a separate persistent host, or on your Mac for local development. Vercel cannot reach your Mac through its own localhost.

To activate production inference, run the Laya service on a reachable host behind HTTPS with `LAYA_API_KEY` authentication. Set `LAYA_BASE_URL` to that server origin, the matching `LAYA_API_KEY`, `LAYA_MODEL=typed-decisions`, and the independent `CHANGE_IMPACT_ACCESS_TOKEN` in Vercel Production environment variables, then redeploy. Add `GITHUB_TOKEN` if needed. The model uses a 12-second request timeout in Vercel and 120 seconds locally; warm the checkpoint before serving requests. Without a configured backend production remains a labeled demo and live requests fail closed. No model weights are bundled into the Vercel function.

The app is available at [archeo.maxrecursion.dev](https://archeo.maxrecursion.dev) with [Vercel fallback](https://archeo-sigma.vercel.app). The portfolio is [maxrecursion.dev](https://maxrecursion.dev/#projects).

## Security and privacy

The server accepts repository identity fields, never arbitrary URLs. GitHub API requests use a fixed origin. Branches are pinned to commit SHAs, source paths are checked against the commit tree, repository code is never executed, and analysis remains in page memory. Clear or reload to discard it. See [docs/SECURITY.md](docs/SECURITY.md).

## Development status

The source-backed graph and metadata-based Change Impact Intelligence are implemented. Real local CPU inference with Laya 0.4.21 and the typed-decisions checkpoint passes the synthetic transport smoke test. Hosted live inference still requires a reachable model backend. The ten-scenario evaluation measures the deterministic demo only, not Laya accuracy. Broader workspace grouping, static path tracing, C#/.NET support and optional prose explanations remain in [docs/ROADMAP.md](docs/ROADMAP.md).

Troubleshooting: `401/403` in live mode means operator authorization or consent is missing; `503` means live mode is disabled. A `mode: unavailable` response retains the comparison evidence and includes a safe `LAYA_*` code for service authentication/rate/timeout/schema issues. GitHub `RATE_LIMITED` responses include a retry delay. Excluded or excessive files are visibly partial; inspect the full GitHub diff before acting. Neither demo nor live decisions approve a merge.
