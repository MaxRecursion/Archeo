import { createHash, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { ChangeFactsSchema, ImpactResponseSchema, type ChangeFacts, type ImpactResponse, type JevDecision } from '../../../src/lib/validation/changeImpact.js'
import { collectChangeFacts } from '../analysis/changeAnalysis.js'
import { askJev, JevError } from '../jev/client.js'
import { baselineDecision } from '../jev/mock.js'
import { applyChangeImpactPolicy, POLICY_VERSION } from '../jev/policy.js'
import { JEV_MODEL, QUESTION_VERSION } from '../jev/questions.js'
import { errorResponse, SafeError } from '../security/errors.js'
import { parseRepository, readJsonBody, validateBranch } from '../security/validation.js'

const InputSchema = z.object({
  repository: z.string().trim().min(1).max(500),
  baseRef: z.string().trim().min(1).max(200),
  headRef: z.string().trim().min(1).max(200),
  mode: z.enum(['mock', 'live']).default('mock'),
  consent: z.boolean().default(false),
}).strict()

// Warm-instance optimizations only. Never a distributed rate/cost guarantee.
const cache = new Map<string, { decision: JevDecision; expiresAt: number }>()
const inFlight = new Map<string, Promise<JevDecision>>()
let liveWindow = { start: Date.now(), count: 0 }
const CACHE_TTL = 5 * 60_000
const CACHE_LIMIT = 32

export function decisionCacheKey(facts: ChangeFacts, mode: string, actor: string, model: string): string {
  return createHash('sha256').update(JSON.stringify({ facts, mode, actor, model, questions: QUESTION_VERSION, policy: POLICY_VERSION })).digest('hex')
}

export async function handleChangeImpact(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } })
  const started = performance.now()
  try {
    const parsed = InputSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) throw new SafeError('INVALID_INPUT', 'Enter a public repository, base ref, head ref and supported mode.', 400)
    const input = parsed.data
    parseRepository(input.repository)
    validateBranch(input.baseRef)
    validateBranch(input.headRef)
    let actor = 'public-demo'
    if (input.mode === 'live') {
      actor = authorizeLive(request)
      if (!input.consent) throw new SafeError('FORBIDDEN', 'Consent is required before sending public change metadata to TypeSafe.', 403)
    }
    const facts = ChangeFactsSchema.parse(await collectChangeFacts(input.repository, input.baseRef, input.headRef))
    let mode: ImpactResponse['mode'] = input.mode
    let decision: JevDecision | null = null
    let error: ImpactResponse['error']
    let retryAfter: number | undefined
    let cached = false
    const key = decisionCacheKey(facts, input.mode, actor, process.env.TYPESAFE_MODEL || JEV_MODEL)
    const hit = cache.get(key)
    if (hit && hit.expiresAt > Date.now()) { decision = hit.decision; cached = true }
    else {
      if (hit) cache.delete(key)
      try {
        if (input.mode === 'mock') decision = baselineDecision(facts)
        else if (inFlight.has(key)) { decision = await inFlight.get(key)!; cached = true }
        else {
          enforceLiveLimit()
          const pending = askJev(facts)
          inFlight.set(key, pending)
          try { decision = await pending } finally { inFlight.delete(key) }
        }
        if (decision) {
          if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
          cache.set(key, { decision, expiresAt: Date.now() + CACHE_TTL })
        }
      } catch (cause) {
        mode = 'unavailable'
        const safe = cause instanceof JevError ? cause : new JevError('JEV_UNAVAILABLE', 'The Jev assessment is unavailable. Deterministic evidence remains available.', 502)
        error = { code: safe.code, message: safe.message }
        retryAfter = safe.retryAfterSeconds
        // Bounded operational diagnostics; no repository identity, state, tokens or upstream messages.
        console.warn(JSON.stringify({ event: 'change_impact_unavailable', code: safe.code, status: safe.status }))
      }
    }
    const result = ImpactResponseSchema.parse({ facts, mode, decision, policy: applyChangeImpactPolicy(facts, decision), ...(error ? { error } : {}), cached, latencyMs: Math.round(performance.now() - started) })
    return Response.json(result, { headers: { 'cache-control': 'no-store', ...(error?.code === 'JEV_RATE_LIMITED' ? { 'retry-after': String(retryAfter ?? 60) } : {}) } })
  } catch (error) {
    const response = errorResponse(error)
    response.headers.set('cache-control', 'no-store')
    return response
  }
}

function authorizeLive(request: Request): string {
  const expected = process.env.CHANGE_IMPACT_ACCESS_TOKEN
  if (!expected || expected.length < 32) throw new SafeError('SERVICE_UNAVAILABLE', 'Live analysis is disabled. The app owner must configure server credentials and an operator access token.', 503)
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) throw new SafeError('FORBIDDEN', 'Cross-origin live analysis is not allowed.', 403)
  const supplied = request.headers.get('authorization')
  if (!supplied?.startsWith('Bearer ')) throw new SafeError('UNAUTHORIZED', 'An operator access token is required for live analysis.', 401)
  const digest = (value: string) => createHash('sha256').update(value).digest()
  if (!timingSafeEqual(digest(supplied.slice(7)), digest(expected))) throw new SafeError('FORBIDDEN', 'The operator access token is invalid.', 403)
  return digest(expected).toString('hex')
}

function enforceLiveLimit() {
  if (Date.now() - liveWindow.start >= 60_000) liveWindow = { start: Date.now(), count: 0 }
  if (liveWindow.count >= 10) throw new JevError('JEV_RATE_LIMITED', 'This server instance has reached its live analysis limit. Retry in a minute.', 429, 60)
  liveWindow.count += 1
}
