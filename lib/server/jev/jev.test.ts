// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChangeFactsSchema, ImpactResponseSchema, JevDecisionSchema } from '../../../src/lib/validation/changeImpact.js'
import { askJev } from './client.js'
import { EVALUATION_CASES, evaluationFacts } from './evaluation.js'
import { baselineDecision } from './mock.js'
import { applyChangeImpactPolicy, pathSignals } from './policy.js'
import { changeImpactQuestions, JEV_MODEL } from './questions.js'

const facts = evaluationFacts(EVALUATION_CASES[0])
function validDecision() { return { ...baselineDecision(facts), model: JEV_MODEL } }
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('official question contract and runtime validation', () => {
  it('batches Choice, Score and Noul with documented criteria shapes', () => {
    expect(Object.keys(changeImpactQuestions)).toEqual(['classification', 'impact', 'review'])
    expect(changeImpactQuestions.classification.type).toBe('choice')
    expect(changeImpactQuestions.classification.criteria).toHaveProperty('other_or_unclear')
    expect(changeImpactQuestions.impact.criteria).toHaveLength(5)
    expect(changeImpactQuestions.review.criteria).toHaveProperty('true')
    expect(changeImpactQuestions.review.criteria).toHaveProperty('false')
  })
  it('accepts fractional probability-weighted Score positions and null usage', () => {
    const value = validDecision()
    value.answers.impact.probabilities = { '0': 0, '1': 0.57, '2': 0.43, '3': 0, '4': 0 }
    value.answers.impact.score = 1.43
    expect(JevDecisionSchema.parse(value).answers.impact.score).toBe(1.43)
  })
  it.each(['missing-answer', 'unknown-choice', 'missing-probability', 'wrong-total', 'wrong-winner', 'score-mismatch', 'negative-score', 'invalid-noul', 'extra-field', 'wrong-legend'])('rejects malformed %s', (kind) => {
    const value: Record<string, unknown> = structuredClone(validDecision())
    const answers = value.answers as Record<string, Record<string, unknown>>
    if (kind === 'missing-answer') delete answers.review
    if (kind === 'unknown-choice') answers.classification.choice = 'unknown'
    if (kind === 'missing-probability') delete (answers.classification.probabilities as Record<string, unknown>).other_or_unclear
    if (kind === 'wrong-total') (answers.classification.probabilities as Record<string, unknown>).other_or_unclear = 0.5
    if (kind === 'wrong-winner') answers.classification.choice = 'api_contract_change'
    if (kind === 'score-mismatch') answers.impact.score = 3.2
    if (kind === 'negative-score') answers.impact.score = -1
    if (kind === 'invalid-noul') answers.review.noul = 1.01
    if (kind === 'extra-field') answers.review.confidence = 0.9
    if (kind === 'wrong-legend') (answers.impact.legend as Record<string, unknown>)['0'] = 'wrong rubric'
    expect(JevDecisionSchema.safeParse(value).success).toBe(false)
  })
  it('enforces evidence count/path/count bounds and rejects extra input fields', () => {
    expect(ChangeFactsSchema.safeParse({ ...facts, files: Array(61).fill(facts.files[0]) }).success).toBe(false)
    expect(ChangeFactsSchema.safeParse({ ...facts, files: [{ ...facts.files[0], path: 'a'.repeat(301) }] }).success).toBe(false)
    expect(ChangeFactsSchema.safeParse({ ...facts, totalChangedFiles: 0 }).success).toBe(false)
    expect(ChangeFactsSchema.safeParse({ ...facts, patches: 'must never be sent' }).success).toBe(false)
  })
  it('rejects response-mode contradictions', () => {
    expect(ImpactResponseSchema.safeParse({ facts, mode: 'live', decision: null, policy: applyChangeImpactPolicy(facts, null), latencyMs: 0, cached: false }).success).toBe(false)
  })
})

describe('deterministic policy and clearly identified mock', () => {
  it('does not call the mock a Jev model or report measured usage', () => {
    const decision = baselineDecision(facts)
    expect(decision.model).toBe('deterministic-demo-v1')
    expect(decision.usage).toEqual({ input_tokens: null, output_tokens: null })
  })
  it('escalates missing evidence, empty diffs and unavailable inference', () => {
    for (const input of [{ ...facts, partial: true }, { ...facts, files: [], totalChangedFiles: 0 }]) expect(applyChangeImpactPolicy(input, baselineDecision(input))).toMatchObject({ reviewRequired: true, uncertain: true })
    expect(applyChangeImpactPolicy(facts, null)).toMatchObject({ reviewRequired: true, uncertain: true })
  })
  it('escalates security paths even if the model disagrees', () => {
    const security = evaluationFacts(EVALUATION_CASES[4])
    expect(applyChangeImpactPolicy(security, validDecision()).reviewRequired).toBe(true)
    expect(applyChangeImpactPolicy({ ...facts, files: [{ ...facts.files[0], signals: ['security-boundary-path'] }] }, validDecision()).reviewRequired).toBe(true)
  })
  it('escalates low confidence and ambiguous review probability', () => {
    const decision = validDecision()
    decision.answers.classification.confidence = 0.3
    decision.answers.review.noul = 0.5
    expect(applyChangeImpactPolicy(facts, decision)).toMatchObject({ reviewRequired: true, uncertain: true })
  })
  it('uses inclusive impact and review thresholds', () => {
    const decision = validDecision()
    decision.answers.impact.score = 2.5
    expect(applyChangeImpactPolicy(facts, decision).reviewRequired).toBe(true)
    decision.answers.impact.score = 0
    decision.answers.review.noul = 0.6
    expect(applyChangeImpactPolicy(facts, decision).reviewRequired).toBe(true)
  })
  it('finds bounded path evidence without claiming a vulnerability', () => {
    expect(pathSignals('src/auth/permissions.ts')).toContain('security-boundary-path')
    expect(pathSignals('docs/README.md')).toContain('test-or-documentation-path')
    expect(pathSignals('src/authentication.ts')).toContain('security-boundary-path')
    expect(pathSignals('src/author.ts')).not.toContain('security-boundary-path')
  })
})

describe('official SDK transport with mocked network', () => {
  it('sends one fixed-origin metadata-only request with all questions and validates the model', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(validDecision()))
    const result = await askJev(facts, { apiKey: 'synthetic-key', fetch })
    expect(result.model).toBe(JEV_MODEL)
    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.typesafe.ai/v1/systemone')
    const body = JSON.parse(String(init.body))
    expect(body.questions.impact.type).toBe('score')
    expect(Object.keys(body.questions)).toHaveLength(3)
    expect(body.state).toEqual(facts)
    expect(body.model).toBe(JEV_MODEL)
  })
  it('does not send a request without credentials', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', '')
    const fetch = vi.fn()
    await expect(askJev(facts, { fetch })).rejects.toMatchObject({ code: 'JEV_AUTHENTICATION' })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('ignores environment overrides for logging and provider origin', async () => {
    vi.stubEnv('TYPESAFE_BASE_URL', 'http://127.0.0.1/private')
    vi.stubEnv('TYPESAFE_LOG_LEVEL', 'debug')
    const log = vi.spyOn(console, 'debug')
    const fetch = vi.fn().mockResolvedValue(Response.json(validDecision()))
    await askJev(facts, { apiKey: 'synthetic-key', fetch })
    expect(fetch.mock.calls[0][0]).toBe('https://api.typesafe.ai/v1/systemone')
    expect(log).not.toHaveBeenCalled()
  })
  it.each([[401, 'JEV_AUTHENTICATION'], [402, 'JEV_FORBIDDEN'], [403, 'JEV_FORBIDDEN'], [429, 'JEV_RATE_LIMITED'], [500, 'JEV_UNAVAILABLE'], [529, 'JEV_UNAVAILABLE'], [422, 'JEV_INVALID_REQUEST']])('maps upstream %i safely and never retries', async (status, code) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: 'synthetic-secret-and-source' }, { status: Number(status), headers: { 'retry-after': '19' } }))
    try { await askJev(facts, { apiKey: 'synthetic-key', fetch }); expect.fail('must reject') } catch (error) {
      expect(error).toMatchObject({ code })
      expect(String(error)).not.toContain('synthetic-secret')
      if (status === 429) expect(error).toMatchObject({ retryAfterSeconds: 19 })
    }
    expect(fetch).toHaveBeenCalledOnce()
  })
  it.each([{}, { ...validDecision(), model: 'jev-1.13.0' }])('rejects invalid successful output', async (body) => {
    await expect(askJev(facts, { apiKey: 'synthetic-key', fetch: vi.fn().mockResolvedValue(Response.json(body)) })).rejects.toMatchObject({ code: 'JEV_INVALID_RESPONSE' })
  })
  it('bounds response bytes before parsing', async () => {
    await expect(askJev(facts, { apiKey: 'synthetic-key', fetch: vi.fn().mockResolvedValue(new Response('x'.repeat(66_000))) })).rejects.toMatchObject({ code: 'JEV_INVALID_RESPONSE' })
  })
  it('maps network failures without leaking transport errors', async () => {
    await expect(askJev(facts, { apiKey: 'synthetic-key', fetch: vi.fn().mockRejectedValue(new Error('sensitive detail')) })).rejects.toMatchObject({ code: 'JEV_UNAVAILABLE' })
  })
  it('aborts at a finite deadline and makes one attempt', async () => {
    const fetch = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })))
    await expect(askJev(facts, { apiKey: 'synthetic-key', fetch, timeoutMs: 10 })).rejects.toMatchObject({ code: 'JEV_TIMEOUT' })
    expect(fetch).toHaveBeenCalledOnce()
  })
})
