# Codebase Archaeologist

**Understand any codebase. See how everything connects.**

Codebase Archaeologist reads a public GitHub repository at a pinned commit and turns supported JavaScript and TypeScript imports into an interactive, source-backed architecture map. Phase 1 is deterministic: imports are parsed from source, directory structure comes from repository paths, and unresolved imports remain explicit.

**Change Impact Intelligence** adds a bounded public GitHub comparison and optional Jev by TypeSafe AI decisions. The deployed public demo uses deterministic, simulated decisions; live Jev requires server credentials, operator access and consent. Live inference has not been verified with a TypeSafe account.

Application: [archeo-sigma.vercel.app](https://archeo-sigma.vercel.app). Portfolio: [maxrecursion.dev](https://maxrecursion.dev/#projects).

## Phase 1 features

- Analyze a public GitHub repository by URL or `owner/repository` and branch.
- Resolve the branch once, then read the Git tree and blobs at its commit SHA.
- View project, module, file, npm package, Node built-in, and unresolved import nodes.
- Inspect static imports, re-exports, literal dynamic imports, CommonJS `require`, exported symbols, and evidence locations.
- Search the repository and graph, filter node kinds, collapse side panels, and switch between overview and file detail.
- Browse source and manifests at the pinned commit, export the visible graph as SVG, and clear page state.
- Run the sample repository through the same API and analyzer as user input.

### Jev change assessment

- Open **Change impact** in the workspace and enter a base and head branch or commit from the same public repository.
- The server checks public visibility, pins both refs and collects up to 60 eligible filename/status/line-count records, excluding generated artifacts, lockfiles and credential files.
- **Choice** classifies the change into eight documented categories, including `other_or_unclear`.
- **Score** estimates potential impact as a continuous probability-weighted position on a five-level 0–4 rubric. It is not a severity percentage.
- **Noul** returns the probability that human review is warranted. It has no separate confidence field. Choice and Score confidence are shown separately from their distributions.
- All three independent questions share one official SDK request. Ordinary TypeScript applies the review policy, validates responses and retains deterministic evidence if Jev fails.
- The free demo uses the same evidence and UI with explicitly simulated decisions. Its figures are not live Jev probabilities or evaluation results.
- Jev receives public metadata only. It does not read the repository, build the graph, run tests, detect vulnerabilities or generate explanatory prose. The comparison does not currently use semantic diffs or compute transitive dependency impact.

For a reproducible comparison, analyze `MaxRecursion/Archeo` on `main`, then compare base `d91b9dec67bf929886225329c548c8104c5de3bd` with head `c79a70d7c4eae5800326dadb3459f0cf30574e85`. These are public pre-integration commits. Comparing `main` with its current commit gives an empty result; choose an earlier base to see changed files.

### Supported inputs and limits

- Public GitHub repositories only. GitHub URLs must use `https://github.com/owner/repository`; `owner/repository` also works.
- JavaScript (`.js`, `.jsx`) and TypeScript (`.ts`, `.tsx`) static syntax. Root `tsconfig.json` and `jsconfig.json` `baseUrl`/`paths` aliases are supported when their targets are in the analyzed source set.
- Vite, React, Vue, Svelte, Angular, Next.js, Remix, Express, and Fastify are detected only when named in a package manifest.
- No runtime call graph, semantic TypeScript checking, package installation, source execution or private repository support. Jev judgments are optional, probabilistic and explicitly distinguished from deterministic graph evidence.
- Large trees and files can produce a clearly marked partial result. The current centralized budgets are documented in [docs/SECURITY.md](docs/SECURITY.md).
- SVG export is implemented. PNG export is not included in Phase 1.

## Stack and layout

- React 19, Vite 8, strict TypeScript, React Router, Tailwind CSS 4, shadcn-style local UI primitives, Lucide, React Flow, Zod, and highlight.js.
- One Vercel Node.js Function in `/api/router.ts` dispatches four API routes; deterministic GitHub/source analysis and the official `@typesafe-ai/sdk` 0.7.0 adapter live in `lib/server`; client-safe schemas and graph transforms live in `src/lib`.
- No database, user accounts or persistent analysis storage. Optional live inference has operator bearer authorization; graph analysis and the demo need no secrets.

## Local development

Requires Node.js 22+ and npm (verified locally with Node 22.22.2/npm 10.9.7; Vercel uses Node 24). The pinned official TypeSafe SDK requires Node 22+.

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

## Environment variables

No environment variables are required for graph analysis or the deterministic demo. For optional live inference, copy `.env.example` to `.env.local`; Vite middleware loads only the documented server settings. Restart the dev server after changing them. Never use `VITE_*` for credentials.

- `GITHUB_TOKEN` is optional for local development, but recommended for the public Vercel deployment. Without it, visitors share the deployment's anonymous GitHub API quota, which currently allows 60 unauthenticated requests per hour per IP. Set it as a server-side Vercel environment variable; never use a `VITE_*` name or commit the token.
- `TYPESAFE_API_KEY`: optional server-only key from the [TypeSafe console](https://console.typesafe.ai/), required for live mode. Sign up, verify email, create an API key in the console and arrange credits with an organization Owner/Admin if necessary. No credits are purchased by this project.
- `TYPESAFE_MODEL`: optional model identifier, defaults to the pinned `jev-1.14.0`.
- `CHANGE_IMPACT_ACCESS_TOKEN`: optional random operator secret of at least 32 characters, required to enable live mode. Use a password manager to generate/store it. Enter this separate token in the live UI; never enter the TypeSafe key in the browser. Secrets stay in ignored local files or Vercel environment settings.

For the optional paid smoke test, configure `TYPESAFE_API_KEY` locally and run `npm run test:live`. It sends one synthetic, non-sensitive scenario, validates the response, and reports only model, latency and usage. Ordinary `npm test` skips this smoke test and never needs provider credentials. No live smoke result is claimed until that command succeeds with authorized account access.

Official pricing verified on 2026-10-28 is $0.042 per million input tokens with free output. A 5,000-input-token request would cost about $0.00021 at that rate; actual billing is unmeasured. Rate limits vary by organization. The application bounds state, batches questions, makes zero automatic Jev retries, and uses a small ephemeral cache. See [verified provider contract, account and limits](docs/jev-integration.md), [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), and [reproducible evaluation](docs/evaluation.md).

## Vercel deployment

The public repository is [MaxRecursion/Archeo](https://github.com/MaxRecursion/Archeo). It is connected to the Vercel project `archeo`; pushes to `main` trigger production deployments.

The Vercel project uses this repository root (`.`), Node.js 24, `npm run build`, and the `dist` output directory. These settings and API rewrites are recorded in `vercel.json`. The shared `api/router.ts` Node.js Function serves all three API routes. Add a fine-grained GitHub token with read-only access to public repository contents directly in Vercel Project Settings → Environment Variables, select Production, then redeploy. From this repository you can also run `vercel env add GITHUB_TOKEN --environment production --scope max-recursion`; the CLI prompts for the secret. Never put the token in source control, a `VITE_*` variable, or chat.

The shared function has a 30-second Vercel maximum and the analyzer has a smaller internal 25-second budget. Source preview uses bounded GitHub requests. These are conservative request caps, not a guarantee that every repository fits a single function invocation. Review current [Node.js runtime versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [function duration limits](https://vercel.com/docs/functions/configuring-functions/duration), and [function limits](https://vercel.com/docs/functions/limitations) before changing them.

Deploy a preview with `vercel deploy --scope max-recursion`, test the homepage and API, then publish with `vercel deploy --prod --scope max-recursion`. Reuse the linked `archeo` project. To enable live mode, add `TYPESAFE_API_KEY` and `CHANGE_IMPACT_ACCESS_TOKEN` using `vercel env add <NAME> production --scope max-recursion`, and optionally add `TYPESAFE_MODEL`; repeat for preview if needed. The CLI prompts securely. Do not overwrite unrelated variables. Redeploy after setting secrets. Without them production remains a clearly labeled demo, and live requests fail closed.

The custom domain is attached to this Vercel project but did not resolve during this integration's baseline check. The working Vercel alias is linked above. Because `maxrecursion.dev` uses external DNS nameservers, create this DNS record at the domain's DNS provider to finish routing the subdomain (verify the target in Vercel Domains before applying):

| Type | Host | Value |
| --- | --- | --- |
| CNAME | `archeo` | `973b9471297de02c.vercel-dns-017.com` |

## Security and privacy

The server accepts repository identity fields, never arbitrary URLs. GitHub API requests use a fixed origin. Branches are pinned to commit SHAs, source paths are checked against the commit tree, repository code is never executed, and analysis remains in page memory. Clear or reload to discard it. See [docs/SECURITY.md](docs/SECURITY.md).

## Development status

The source-backed graph and metadata-based Change Impact Intelligence are implemented. Live Jev transport is tested against mocked HTTP; account-dependent inference remains unverified. The ten-scenario evaluation measures the deterministic demo only, not Jev accuracy. Broader workspace grouping, static path tracing, C#/.NET support and optional prose explanations remain in [docs/ROADMAP.md](docs/ROADMAP.md).

Troubleshooting: `401/403` in live mode means operator authorization or consent is missing; `503` means live mode is disabled. A `mode: unavailable` response retains the comparison evidence and includes a safe `JEV_*` code for provider auth/credits/rate/timeout/schema issues. GitHub `RATE_LIMITED` responses include a retry delay. Excluded or excessive files are visibly partial; inspect the full GitHub diff before acting. Neither demo nor live decisions approve a merge.
