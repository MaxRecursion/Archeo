# Self-hosted Laya integration

Laya replaces the former hosted Jev provider. The app no longer depends on the TypeSafe SDK, TypeSafe credentials or a paid inference API. Historical Jev execution reports describe the earlier implementation only.

## Verified contract and runtime

The [official Laya project](https://github.com/NandhaKishorM/laya) ships Apache-2.0 checkpoints, supports CPU and Apple MPS, and exposes `POST /v1/systemone` through `laya[serve]`. The application pins Laya 0.4.21 and records its resolved Python dependencies in `runtime/requirements-laya.lock.txt`. Run `npm run laya:setup` with Python 3.12+ for the pinned runtime, then `npm run laya:serve`. Only the typed-decisions checkpoint is preloaded; first startup downloads public weights. CPU/MPS inference is separate from the Node/Vite process.

The request is `{model, state, questions, max_len:4096, head_max_len:512}`. Three independent questions share one request: eight-category Choice, five-level continuous Score, and review Noul. `LAYA_MODEL` selects `typed-decisions`, `english` or `multilingual`; the supplied runtime launcher preloads typed-decisions. Checkpoint alias selection is sent explicitly to prevent automatic routing changing the intended checkpoint.

## Evidence, validation and interpretation

The GitHub boundary still verifies public visibility and pins both refs. Only the first 12 eligible filename/status/count/signal records are sent, without repository identity, source, patches or commit messages. Application state is capped at 16 KiB and responses at 64 KiB. Extra Laya routing/action fields are normalized away; required answer fields, exact rubric, probability sums, winner consistency, expected Score and value ranges are validated.

Laya's native `confidence` measures normalized entropy/concentration. It is not a calibrated likelihood of correctness; the UI uses the concentration label. Noul is the model's yes judgment probability. Every real Laya assessment recommends human review and is marked uncertain until code-change evaluation and calibration justify different policy. The deterministic demo remains separate and is not model evaluation.

The server's usage truncation diagnostics are preserved (do not enable `LAYA_JEV_STRICT`, which hides them). Omitted files or server truncation mark the evidence partial. The [publisher's limitations](https://huggingface.co/convaiinnovations/laya#honest-limits) include weak base zero-shot performance, constrained prompt budgets and possible probability miscalibration. Choosing typed-decisions does not establish accuracy for this app's domain.

## Configuration and trust boundaries

The supplied dependency lock requires Python 3.12+ (NumPy/NetworkX impose this minimum), even though upstream Laya itself supports older Python versions. Installation and real inference were verified on this Apple Silicon Mac with Python 3.12 and CPU execution; other host/device combinations need their own smoke test.

- `LAYA_BASE_URL`: defaults to `http://127.0.0.1:8000` only outside Vercel. It is a server-owned origin, never accepted from the browser.
- `LAYA_MODEL`: defaults to `typed-decisions`.
- `LAYA_API_KEY`: optional for loopback, required for remote HTTPS. Configure the same bearer key on the Python service. This is a self-hosted service password, not a purchased provider key.
- `CHANGE_IMPACT_ACCESS_TOKEN`: independent app operator password, at least 32 characters, required for live requests plus explicit sharing consent. Stored in browser memory only when entered.
- `GITHUB_TOKEN`: optional least-privilege public-read token.

Non-loopback HTTP, credentials/query/fragment/path components in the server origin, redirects and unauthenticated remote targets are rejected. On Vercel, loopback targets are rejected. Requests have no retries, a 120-second local timeout and a 12-second Vercel timeout. Errors are mapped to safe `LAYA_*` codes without upstream bodies or secret values. Warm-instance decision caching includes normalized facts, mode, actor, endpoint, service-key digest, model and question/policy versions. A warm-instance limiter caps new live calls; neither is a distributed availability guarantee.

Vercel deploys the React UI and Node API, not Python weights. For production inference, supply a separately hosted, warmed, authenticated HTTPS Laya server. Without one, production remains a clearly labeled demo with live disabled/unavailable. Your laptop's localhost cannot serve a remote Vercel function.

## Validation

`npm test` covers schemas, normalization, policy, mocked HTTP and failure handling without downloading weights. `npm run test:e2e` covers the UI and existing graph/theme workflows. `npm run test:live` explicitly runs real synthetic metadata against the configured Laya server, reports only model/latency/usage, and requires no paid provider account. `npm run evaluate` measures the deterministic demo only. See [setup-keys.md](setup-keys.md) for operation.
