# Activate GitHub access and live Jev

These steps configure the existing Vercel project `max-recursion/archeo`. No code changes are required to enable live inference. The app supports public GitHub repositories; graph analysis and the deterministic demo also work without provider credentials, subject to GitHub's anonymous quota.

## 1. Obtain the Jev key

1. Sign in at the [TypeSafe console](https://console.typesafe.ai/) and complete any email/account verification.
2. Select the organization you want to use, create an API key through the console's key-management interface, and save it privately. The official [quickstart](https://docs.typesafe.ai/introduction/quickstart) links this flow. Exact authenticated sidebar labels can vary; no unofficial `/keys` URL is required.
3. Verify that the organization can make API requests and has sufficient credits. [Settings → Billing](https://help.typesafe.ai/articles/7771619341-how-do-i-add-credits) is the documented credit-management location and requires organization Admin access. Adding funds is an owner decision; no payment or automatic top-up is part of this setup guide.
4. Keep the app's pinned model setting `jev-1.14.0`. If the account cannot access the model, check the console and [official model documentation](https://docs.typesafe.ai/models).

If you already have a valid TypeSafe key and account access, reuse them. The key becomes `TYPESAFE_API_KEY` in step 4.

## 2. Obtain a public-read GitHub token

1. Open [GitHub's fine-grained token creation page](https://github.com/settings/personal-access-tokens/new). The navigation is profile → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. Set a recognizable name, such as `Archeo public GitHub reads`, and an expiration. Record its renewal date.
3. Choose your personal resource owner (`MaxRecursion` for this project).
4. Keep Repository access limited to **Public repositories** and add **no additional permissions**. Every fine-grained token includes public-repository read access; these public metadata/commit/tree/blob/compare endpoints do not require extra repository permissions. See [GitHub token documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and [comparison endpoint permissions](https://docs.github.com/en/rest/commits/commits#compare-two-commits).
5. Generate the token and save it privately. This becomes `GITHUB_TOKEN` in step 4.

This raises the available GitHub API quota for server-side reads. The app has no GitHub OAuth login and still rejects private repositories. No workflow, administration or write permissions are needed.

## 3. Generate an app operator password

Use a password manager to generate a random password of at least **32 characters** (64 random characters is suitable). Save it as your Archeo operator password. This becomes `CHANGE_IMPACT_ACCESS_TOKEN`.

This password authorizes live inference from the browser. It is separate from the Jev and GitHub provider keys. Keep it private: the person holding it can request paid analysis.

## 4. Add environment variables in Vercel

1. Open the existing [Archeo Vercel project](https://vercel.com/max-recursion/archeo).
2. Open its Environment Variables page (under project settings/sidebar).
3. Add these exact names and values, selecting **Production**:

| Name | Value | Required for |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | Your TypeSafe API key | Live Jev |
| `GITHUB_TOKEN` | Your public-read GitHub token | Higher GitHub quota |
| `CHANGE_IMPACT_ACCESS_TOKEN` | The random app operator password from step 3 | Live Jev authorization |
| `TYPESAFE_MODEL` | `jev-1.14.0` | Explicit model pin; the app defaults to this value |

4. Save each variable. Select Preview too only if you want preview deployments to use those credentials. Development is separate and optional.
5. These are server variables. Use the names exactly as shown, without `VITE_` prefixes. Paste only the value, without surrounding quotes or a `Bearer ` prefix. Never paste secrets into chat, source code, README files or Git commits.

The CLI is an alternative; each command prompts for the value instead of embedding it in shell history:

```sh
cd /Users/akshaykulkarni/AutoVerse/Archeo
vercel env add TYPESAFE_API_KEY production --scope max-recursion
vercel env add GITHUB_TOKEN production --scope max-recursion
vercel env add CHANGE_IMPACT_ACCESS_TOKEN production --scope max-recursion
vercel env add TYPESAFE_MODEL production --scope max-recursion
```

Use either the dashboard or CLI; do not create duplicate entries for the same name/environment. If a variable already exists, update the intended entry and preserve unrelated settings.

## 5. Redeploy after saving the variables

Open Vercel → Archeo → Deployments, choose the latest production deployment built from `main`, and select **Redeploy**. Wait for **Ready**.

Environment changes apply to **new deployments**, so a browser refresh alone does not load new server credentials. See [Vercel environment-variable documentation](https://vercel.com/docs/environment-variables/managing-environment-variables).

## 6. Verify the live application

1. Open [archeo.maxrecursion.dev](https://archeo.maxrecursion.dev/). If your network still caches an old DNS answer, use the same app at [archeo-sigma.vercel.app](https://archeo-sigma.vercel.app/).
2. Enter public repository `developit/mitt`, branch `main`, and click **Analyze repository**. The architecture map should load.
3. Click **Change impact** in the workspace toolbar.
4. Enter this small, existing public comparison:
   - Base: `b240473b5707857ba2c6a8e6d707c28d1e39da49`
   - Head: `6b41670516ed8e8b738612f60491995470aa63b3`
5. Check **Use live Jev (requires operator access)**.
6. Enter your **app operator password** from step 3 into **Operator access token**. The provider API keys stay in Vercel.
7. Read and check the consent box for sharing public change metadata, then click **Analyze change impact**.
8. Confirm the result banner reads **LIVE JEV · TYPESAFE AI**, the model is `jev-1.14.0`, and the comparison's deterministic evidence is visible. Choice confidence, the continuous 0–4 Score, and the Noul probability have separate labels. Available usage metadata appears in the rubric/distributions details.

This step makes a real provider request and can consume credits. A DEMO banner means simulated decisions; an unavailable banner is a safe failure and must not be described as live success. The returned classification/review values are judgments, not fixed expected answers.

## Optional: local development and provider smoke test

From a checkout with Node.js 22+:

```sh
npm ci
```

Create `.env.local` only if it does not already exist; otherwise edit it in place. Copy the variable names from `.env.example` and fill values privately in your editor. Keep any existing unrelated variables. The file is ignored by Git. Restart the dev server after changing it:

```sh
npm run dev
```

For one explicit provider smoke test using synthetic metadata:

```sh
npm run test:live
```

This needs the local `TYPESAFE_API_KEY` (and optionally `TYPESAFE_MODEL`), sends one paid request through the official adapter, validates the response, and reports model/latency/usage without logging the key. It does not test Vercel's environment. Ordinary `npm test` skips paid live inference.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Graph analysis reports GitHub rate limit | `GITHUB_TOKEN` is present in the selected Vercel environment, valid/unexpired, and included in a new deployment. Respect the displayed retry delay. |
| Live request returns `SERVICE_UNAVAILABLE`/503 | Operator password exists as `CHANGE_IMPACT_ACCESS_TOKEN`, is at least 32 characters, and the app was redeployed. |
| Live request returns 401/403 | Enter the matching operator password, check consent, and use the app on its own origin. |
| `JEV_AUTHENTICATION` | Verify `TYPESAFE_API_KEY` in Vercel; remove accidental whitespace/quotes and redeploy. |
| `JEV_FORBIDDEN` | Check TypeSafe organization access, model access and available credits. |
| `JEV_RATE_LIMITED` | Wait for the indicated cooldown; check organization usage limits. |
| `JEV_TIMEOUT`, `JEV_UNAVAILABLE`, `JEV_INVALID_RESPONSE` | Keep the deterministic evidence, inspect the safe code and provider status, and retry deliberately later. Automatic paid retries are disabled. |
| DEMO result after setting keys | Select live mode and provide the operator password and consent. Demo remains the default. |

No server restart service, database, GitHub App, OAuth setup or portfolio secret configuration is required.
