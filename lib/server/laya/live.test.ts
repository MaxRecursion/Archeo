// @vitest-environment node
import { askLaya } from './client.js'
import { EVALUATION_CASES, evaluationFacts } from './evaluation.js'

it.skipIf(process.env.LAYA_LIVE_SMOKE !== '1')('optional real local Laya smoke with synthetic non-sensitive metadata', async () => {
  const started = performance.now()
  const decision = await askLaya(evaluationFacts(EVALUATION_CASES[0]))
  console.info(JSON.stringify({ event: 'laya_live_smoke', model: decision.model, latencyMs: Math.round(performance.now() - started), usage: decision.usage }))
  expect(decision.answers.classification.type).toBe('choice')
}, 150_000)
