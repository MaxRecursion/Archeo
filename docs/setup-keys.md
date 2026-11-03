# Run Archeo with Laya

No Jev/TypeSafe account or API key is needed. Laya is an independent Apache-2.0 model; the Python service and Node app run as two processes.

## Local setup

1. Install Node 22+ and Python 3.12+ for the pinned runtime. On systems where that interpreter has another name, set `PYTHON=python3` when running setup.
2. From the repository root:

   ```sh
   npm ci
   npm run laya:setup
   npm run laya:serve
   ```

3. Leave the model terminal running. First startup downloads the typed-decisions checkpoint; wait until startup completes. Automatic device selection supports Apple MPS and CPU. Set `LAYA_DEVICE=cpu` if needed.
4. Create or edit ignored `.env.local` using `.env.example`. Preserve unrelated settings. Set `CHANGE_IMPACT_ACCESS_TOKEN` to a private random password of at least 32 characters. The app defaults to `LAYA_BASE_URL=http://127.0.0.1:8000` and `LAYA_MODEL=typed-decisions`. No Laya service key is required on loopback. An optional public-read GitHub token goes in `GITHUB_TOKEN` to raise quota.
5. In a second terminal, run `npm run dev`. Analyze `developit/mitt`, branch `main`, then open Change impact.
6. For a reproducible public example compare base `b240473b5707857ba2c6a8e6d707c28d1e39da49` with head `6b41670516ed8e8b738612f60491995470aa63b3`.
7. Enable live Laya, enter the app operator password, and give consent to send public metadata to the configured Laya server. Run the assessment. **LIVE LAYA · SELF-HOSTED** means real inference; DEMO means deterministic simulation.
8. Optionally run `npm run test:live` for a synthetic real-model transport smoke. `npm test` and ordinary CI never require the Python model to be running.

The service script binds `127.0.0.1:8000`, preloads one checkpoint and reads the matching service key/device settings from `.env.local`. Avoid changing that port unless you also update `LAYA_BASE_URL`. The first inference may be slower during warm-up.

## Production Vercel setup

The Python model requires its own persistent host. The Vercel Node function cannot use your laptop's localhost and does not bundle the model.

1. Set up the same Python runtime on an appropriate host, using `npm run laya:setup` or the pinned requirements file.
2. Run it behind HTTPS. Set a private `LAYA_API_KEY` on the service. The launcher refuses an unauthenticated non-loopback bind; set `LAYA_HOST=0.0.0.0` only with that key and an appropriate authenticated reverse proxy/network boundary.
3. In the existing Vercel `archeo` project's Production environment configure:

   | Name | Value |
   | --- | --- |
   | `LAYA_BASE_URL` | Reachable HTTPS origin of your Laya service, without a path |
   | `LAYA_API_KEY` | Matching service bearer key |
   | `LAYA_MODEL` | `typed-decisions` |
   | `CHANGE_IMPACT_ACCESS_TOKEN` | Independent private app operator password, at least 32 characters |
   | `GITHUB_TOKEN` | Optional fine-grained public-read GitHub token |

4. Remove obsolete `TYPESAFE_*` variables if previously configured. Redeploy the latest main commit after saving environment changes. Preview variables are separate.
5. Warm the model and verify one consented live comparison. The serverless call has a 12-second model deadline; a cold or overloaded model returns a safe unavailable state. Ordinary public visitors can still use the labeled demo.

Never use `VITE_*` for secrets or commit `.env.local`. Do not paste passwords into chat. Model concentration/probability figures require domain evaluation; all live assessments deliberately recommend human review.

## Troubleshooting

- Connection/unavailable: confirm `npm run laya:serve` is running and the backend is reachable from the app server.
- 503 live disabled: configure the app operator password and, on Vercel, the remote service origin/key; redeploy.
- 401/403: verify the operator password and consent. `LAYA_AUTHENTICATION` instead concerns the app-to-model service key.
- `LAYA_TIMEOUT`: wait for model startup/warm-up, reduce input or improve backend capacity, then rerun deliberately.
- `LAYA_INVALID_RESPONSE`: check runtime version/response and keep deterministic evidence. Do not hide server truncation with strict compatibility mode.
- Partial evidence: the model uses at most 12 files and may report context truncation. Inspect the complete diff independently.
- GitHub quota: configure/renew the optional public-read token and respect the retry delay.
