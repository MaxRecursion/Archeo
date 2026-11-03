// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChangeFactsSchema, ImpactResponseSchema, DecisionSchema } from '../../../src/lib/validation/changeImpact.js'
import { askLaya } from './client.js'
import { EVALUATION_CASES, evaluationFacts } from './evaluation.js'
import { baselineDecision } from './mock.js'
import { applyChangeImpactPolicy, pathSignals } from './policy.js'
import { changeImpactQuestions, LAYA_MODEL } from './questions.js'

const facts = evaluationFacts(EVALUATION_CASES[0])
function validDecision() { return { ...baselineDecision(facts), model: LAYA_MODEL } }
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
    expect(DecisionSchema.parse(value).answers.impact.score).toBe(1.43)
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
    expect(DecisionSchema.safeParse(value).success).toBe(false)
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
  it('does not call the mock a Laya model or report measured usage', () => {
    const decision = baselineDecision(facts)
    expect(decision.model).toBe('deterministic-demo-v1')
    expect(decision.usage).toEqual({ input_tokens: null, output_tokens: null })
  })
  it('requires human review for live Laya even for concentrated, low impact judgments', () => {
    const decision = validDecision()
    decision.answers.classification.confidence = 0.99
    decision.answers.impact.confidence = 0.99
    decision.answers.impact.score = 0
    decision.answers.review.noul = 0.01
    expect(applyChangeImpactPolicy(facts, decision)).toMatchObject({ reviewRequired: true, uncertain: true })
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

describe('Laya HTTP transport', () => {
  it('batches all questions using bounded metadata and no provider key locally', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ...validDecision(), routing: {}, usage: { input_tokens: 10, output_tokens: 0, state_tokens_dropped: 2, truncated_questions: [] } }))
    const result = await askLaya(facts, { fetch })
    expect(result.evidenceTruncated).toBe(true)
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe('http://127.0.0.1:8000/v1/systemone')
    expect(init.redirect).toBe('error')
    const body = JSON.parse(String(init.body))
    expect(Object.keys(body.questions)).toHaveLength(3)
    expect(body.max_len).toBe(4096)
    expect(body.state.files).toEqual(facts.files)
    expect(body.state).not.toHaveProperty('repository')
    expect(fetch).toHaveBeenCalledOnce()
  })
  it('limits evidence to twelve files and marks omitted files as partial', async () => {
    const input = { ...facts, totalChangedFiles: 13, files: Array.from({ length: 13 }, (_, index) => ({ ...facts.files[0], path: `src/file-${index}.ts` })) }
    const fetch = vi.fn().mockResolvedValue(Response.json(validDecision()))
    expect((await askLaya(input, { fetch })).evidenceTruncated).toBe(true)
    const body = JSON.parse(String(fetch.mock.calls[0][1].body))
    expect(body.state.files).toHaveLength(12)
    expect(body.state.partial).toBe(true)
    expect(body.state.totalChangedFiles).toBe(13)
  })
  it('retains question truncation and removes native action/confidence extras', async () => {
    const wire = structuredClone(validDecision())
    const response = { ...wire, answers: { ...wire.answers, review: { ...wire.answers.review, confidence: 0.9, action: 'accept' } }, usage: { input_tokens: 100, output_tokens: 0, truncated_questions: ['impact'], state_tokens_dropped: 0 } }
    const result = await askLaya(facts, { fetch: vi.fn().mockResolvedValue(Response.json(response)) })
    expect(result.evidenceTruncated).toBe(true)
    expect(result.answers.review).toEqual(wire.answers.review)
  })
  it.each([[401, 'LAYA_AUTHENTICATION'], [403, 'LAYA_AUTHENTICATION'], [429, 'LAYA_RATE_LIMITED'], [503, 'LAYA_RATE_LIMITED'], [500, 'LAYA_UNAVAILABLE'], [422, 'LAYA_INVALID_REQUEST']])('redacts upstream %i without retries', async (status, code) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: 'secret' }, { status: Number(status) }))
    await expect(askLaya(facts, { fetch })).rejects.toMatchObject({ code })
    expect(fetch).toHaveBeenCalledOnce()
  })
  it.each(['http://example.com', 'https://name:secret@example.com', 'https://example.com?url=evil', 'https://example.com/redirect'])('rejects unsafe server settings %s', async (baseURL) => {
    const fetch = vi.fn()
    await expect(askLaya(facts, { baseURL, fetch })).rejects.toMatchObject({ code: 'LAYA_INVALID_REQUEST' })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('fails closed on Vercel without a remote backend', async () => {
    vi.stubEnv('VERCEL', '1'); vi.stubEnv('LAYA_BASE_URL', '')
    await expect(askLaya(facts)).rejects.toMatchObject({ code: 'LAYA_UNAVAILABLE' })
  })
  it('requires service authentication on remote HTTPS', async () => {
    vi.stubEnv('LAYA_API_KEY', '')
    await expect(askLaya(facts, { baseURL: 'https://laya.example' })).rejects.toMatchObject({ code: 'LAYA_INVALID_REQUEST' })
  })
  it('rejects malformed JSON, oversized replies and invalid distributions', async () => {
    for (const body of ['not json', 'x'.repeat(66000), '{}']) await expect(askLaya(facts, { fetch: vi.fn().mockResolvedValue(new Response(body)) })).rejects.toMatchObject({ code: 'LAYA_INVALID_RESPONSE' })
  })
  it('times out with one attempt and no transport details', async () => {
    const fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('secret')), { once: true })))
    await expect(askLaya(facts, { fetch, timeoutMs: 10 })).rejects.toMatchObject({ code: 'LAYA_TIMEOUT' })
    expect(fetch).toHaveBeenCalledOnce()
  })
})
