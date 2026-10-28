// @vitest-environment node
import { askJev } from './client.js'
import { EVALUATION_CASES, evaluationFacts } from './evaluation.js'

it.skipIf(process.env.JEV_LIVE_SMOKE !== '1')('optional paid live Jev smoke with synthetic non-sensitive metadata', async () => {
  expect(process.env.TYPESAFE_API_KEY, 'Configure TYPESAFE_API_KEY server-side before explicitly running npm run test:live.').toBeTruthy()
  const started = performance.now()
  const decision = await askJev(evaluationFacts(EVALUATION_CASES[0]))
  console.info(JSON.stringify({ event: 'jev_live_smoke', model: decision.model, latencyMs: Math.round(performance.now() - started), usage: decision.usage }))
  expect(decision.answers.classification.type).toBe('choice')
}, 12_000)
