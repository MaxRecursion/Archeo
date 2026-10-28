# Jev integration

Contract verified on **28 October 2026** against the official TypeSafe documentation and the installed official package. Live inference has not been verified without an authorized account and key. The public demonstration uses deterministic heuristics, prominently labeled as mock output.

## Verified contract

| Item | Verified value |
| --- | --- |
| Official JavaScript/TypeScript package | `@typesafe-ai/sdk`, pinned to `0.7.0` |
| Runtime | Node.js 22 or newer; use this application's npm lockfile |
| API | `POST https://api.typesafe.ai/v1/systemone` |
| Authentication | `Authorization: Bearer <API key>`; server environment `TYPESAFE_API_KEY` |
| Model | Default pinned `jev-1.14.0`; optional server `TYPESAFE_MODEL` override |
| Request | `{model, state, questions}`; named questions share one state |
| Choice | `{type:"choice", instructions, criteria:{option:description}}` |
| Score | `{type:"score", instructions, criteria:[ordered level descriptions]}` |
| Noul | `{type:"noul", instructions, criteria:{true:description,false:description}}` |
| Response | `{model, answers:{questionName:typedAnswer}, usage:{input_tokens,output_tokens}}` |

The [official JavaScript guide](https://docs.typesafe.ai/sdk/javascript), [SDK changelog](https://docs.typesafe.ai/sdk/javascript/changelog) and [HTTP API reference](https://docs.typesafe.ai/api/system-one) establish these values. The SDK's own npm version records its development package manager; consumers do not need that exact npm version. The project lockfile has been installed with npm 10.9.7.

The [model reference](https://docs.typesafe.ai/models) lists `jev-1.14.0` and `jev-1.13.0`. `jev-latest` and `jev-preview` currently resolve to 1.14.0; aliases can move. The adapter rejects a versioned-model mismatch in a successful response. Account-specific available models must still be checked in the console or authenticated `GET /v1/models`.

## Questions and semantics

`lib/server/jev/questions.ts` constructs three independent questions using the SDK's `choice`, `score` and `noul` helpers. They are sent together once, with no question depending on another result.

- Classification selects one of eight explicit categories, including `other_or_unclear`. Its probability map must include every category and sum to one. The returned `choice` must have maximal probability. The separately reported `confidence` is retained.
- Potential impact uses five concrete levels, positions 0 through 4. The returned value can be fractional: it is the probability-weighted position on that rubric, **not a percentage**. The exact legend, distribution and confidence are validated.
- Human review is a Noul: its value is the probability that review is warranted, in `[0,1]`. It has **no separate confidence field**. The UI displays it as a probability of yes.

See the official [Choice](https://docs.typesafe.ai/primitives/choice), [Score](https://docs.typesafe.ai/primitives/score), [Noul](https://docs.typesafe.ai/primitives/noul) and [confidence](https://docs.typesafe.ai/confidence) references. Security review remains a deterministic path-based escalation; an additional security Noul was omitted because metadata alone does not support a vulnerability assessment.

## State and validation

The server independently checks public repository visibility, pins both refs to immutable commit SHAs and reads bounded GitHub comparison metadata. Only repository identity, refs, SHAs, bounded paths, file status, added/deleted line counts, deterministic path signals and completeness warnings reach Jev. Patches, file bodies, commit messages and user-supplied prompts are excluded. Paths are explicitly described as untrusted evidence in the questions.

`src/lib/validation/changeImpact.ts` is client-safe and contains strict Zod schemas. Evidence contains at most 60 paths, each at most 300 characters; the adapter additionally caps serialized state at 32 KiB. The successful TypeSafe response is capped at 64 KiB before parsing. Schema validation rejects missing/extra fields, unknown categories, invalid ranges, malformed probability sums, inconsistent Choice winners, wrong legends and Score/distribution disagreement. Token counts may be `null`, as supported by SDK 0.7.0, and are never invented.

## Policy and fallback

`applyChangeImpactPolicy` is ordinary TypeScript. It recommends review for incomplete/empty evidence, an unavailable decision, a security-sensitive path or corresponding model category, impact at least 2.5/4, Noul review probability at least 0.6, or uncertain/conflicting signals. Choice or Score confidence below 0.6 and a review probability between 0.35 and 0.65 indicate uncertainty. These are initial application thresholds, not clinically or empirically calibrated safety guarantees. A low result never approves or merges a change.

`baselineDecision` generates **deterministic demo output**, model label `deterministic-demo-v1`, illustrative distributions and null token usage. These distributions are not measured Jev probabilities. Live errors return `mode:"unavailable"`, a null decision and the real deterministic evidence; a failure never silently substitutes a mock for a live result.

## Transport, errors and cost control

The SDK runs only in the server layer. The adapter fixes the official API origin, disables request/body logging, retains browser protections, applies an 8-second timeout and disables automatic retries. One failed inference can have ambiguous billing implications; an explicit user rerun is preferable for this portfolio application. The application error codes distinguish account authentication/access, rate limits, timeouts, rejected requests, invalid responses and upstream unavailability. Error text never contains upstream bodies or headers. A supported `Retry-After` value is bounded and exposed to the route; no automatic retry occurs.

Official [request rules and errors](https://docs.typesafe.ai/api/errors) permit 32 MiB bodies, 64 nested levels and finite JSON numbers. The model reference lists 64k per-request and 32k per-question context limits; this application deliberately stays much smaller and enables neither experimental images nor long context. Official retry guidance covers 429/529 exponential backoff; the SDK supports it, but this adapter chooses zero retries.

The [current model price](https://docs.typesafe.ai/models) is **$0.042 per million input tokens**, with output tokens free. For illustration, 10,000 billable input tokens would cost about $0.00042 at that price; this is arithmetic, not a measured request cost. Actual billable input includes state and questions and must come from usage metadata. Request/token rate limits are per organization and visible in the console; there is no verified universal numeric quota. Do not infer trial credit, minimum purchase or an account balance from the public price.

Live access requires a server-side operator access token in addition to the TypeSafe key and explicit user consent. The public demo performs no paid inference. Warm-instance rate limits and bounded caches are operational optimizations, not global spending guarantees; use provider organization limits for a firm cost boundary. No persistent database or paid cache service is required.

## Account setup requiring the owner

1. Open the [TypeSafe console](https://console.typesafe.ai/), sign up/sign in and complete email verification. [Official account help](https://help.typesafe.ai/articles/4519713419-how-do-i-create-or-activate-my-account-after-an-invitation-or-waitlist-approval) says signups are open without waitlist approval.
2. Select the intended organization and create/manage its API key in the console, following the [quickstart](https://docs.typesafe.ai/introduction/quickstart). Store it as server-only `TYPESAFE_API_KEY` locally or through Vercel's secure environment-variable prompt. Never share it in chat, source, screenshots or `VITE_*` variables.
3. Check organization limits, enabled models and credits. [Credit instructions](https://help.typesafe.ai/articles/7771619341-how-do-i-add-credits) require an organization Admin and Settings → Billing. A [402 response](https://help.typesafe.ai/articles/5505198974-what-s-a-402-error-and-how-can-i-add-more-credits) generally indicates insufficient credits. No credits have been purchased and no automatic top-ups enabled by this work. Any payment requires owner authorization.
4. Set a strong server-only `CHANGE_IMPACT_ACCESS_TOKEN` (at least 32 characters), configure the same authorized operator token in the UI only when using live mode, and run the documented non-sensitive smoke test.

No API key was discovered in the authorized project environment during the implementation inventory. An existing console account, free credit eligibility, organization limits and live model response therefore remain unverified.

## Data handling

The official [privacy policy](https://typesafe.ai/legal/privacy-policy) states that input is not used to train/fine-tune models; it also describes retention and service-provider processing. [Legal documentation](https://docs.typesafe.ai/legal) links the DPA and offers enterprise zero-data-retention arrangements. **Do not assume zero retention for a standard account.** This app supports public repository metadata only and requires explicit live consent. No private repository contents are sent.

## Tests and evaluation

`npx vitest run lib/server/jev/jev.test.ts` exercises the SDK with injected, mocked HTTP responses, not a third-party proxy. It covers the exact request shape, one-call batching, malformed responses, account errors, 429/529, timeout, no retries, redaction, fixed origin, environment logging overrides, policy and demo labeling. Ordinary CI does not need TypeSafe credentials. See [evaluation.md](evaluation.md) for the independent synthetic dataset and reproducible deterministic measurements. Live Jev behavior and billing must be verified separately once configured.
