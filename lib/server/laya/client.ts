import { z } from 'zod'
import { ChangeFactsSchema, DecisionSchema, type ChangeFacts, type Decision } from '../../../src/lib/validation/changeImpact.js'
import { changeImpactQuestions, LAYA_MODEL } from './questions.js'

export class LayaError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly retryAfterSeconds?: number) { super(message); this.name = 'LayaError' }
}
export interface LayaOptions { apiKey?: string; model?: string; baseURL?: string; fetch?: typeof fetch; timeoutMs?: number }
export function layaConfiguration(options: LayaOptions = {}) {
  const configured = options.baseURL ?? process.env.LAYA_BASE_URL
  if (!configured && process.env.VERCEL) throw new LayaError('LAYA_UNAVAILABLE', 'Configure a reachable LAYA_BASE_URL to enable self-hosted inference.', 503)
  let url: URL
  try { url = new URL(configured || 'http://127.0.0.1:8000') } catch { throw new LayaError('LAYA_INVALID_REQUEST', 'Invalid Laya server configuration.', 503) }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const apiKey = options.apiKey ?? process.env.LAYA_API_KEY
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(local && !process.env.VERCEL && url.protocol === 'http:')) || (process.env.VERCEL && local) || (!local && !apiKey)) throw new LayaError('LAYA_INVALID_REQUEST', 'Use loopback HTTP locally or authenticated HTTPS for a hosted Laya server.', 503)
  const model = options.model ?? process.env.LAYA_MODEL ?? LAYA_MODEL
  if (!['english', 'multilingual', 'typed-decisions'].includes(model)) throw new LayaError('LAYA_INVALID_REQUEST', 'Unsupported Laya checkpoint setting.', 503)
  return { url, model, apiKey }
}

export async function askLaya(input: ChangeFacts, options: LayaOptions = {}): Promise<Decision> {
  const facts = ChangeFactsSchema.parse(input)
  const { url, model, apiKey } = layaConfiguration(options)
  const state = { files: facts.files.slice(0, 12), totalChangedFiles: facts.totalChangedFiles, partial: facts.partial || facts.files.length > 12 }
  if (new TextEncoder().encode(JSON.stringify(state)).byteLength > 16 * 1024) throw new LayaError('LAYA_INVALID_REQUEST', 'The bounded evidence exceeds the Laya input limit.', 413)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? (process.env.VERCEL ? 12_000 : 120_000))
  try {
    const response = await (options.fetch ?? globalThis.fetch)(new URL('/v1/systemone', url), {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model, state, questions: changeImpactQuestions, max_len: 4096, head_max_len: 512 }),
    })
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status === 401 || response.status === 403) throw new LayaError('LAYA_AUTHENTICATION', 'The Laya server rejected its configured service credentials.', 502)
      if (response.status === 429 || response.status === 503) throw new LayaError('LAYA_RATE_LIMITED', 'The Laya server is busy. Retry later.', 429, 60)
      if (response.status === 400 || response.status === 422) throw new LayaError('LAYA_INVALID_REQUEST', 'The Laya server rejected the bounded request.', 502)
      throw new LayaError('LAYA_UNAVAILABLE', 'The Laya server is unavailable. Deterministic evidence remains available.', 502)
    }
    if (!response.body) throw new LayaError('LAYA_INVALID_RESPONSE', 'The Laya server returned an empty response.', 502)
    const reader = response.body.getReader(); let size = 0; const chunks: Uint8Array[] = []
    try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 64 * 1024) { await reader.cancel(); throw new LayaError('LAYA_INVALID_RESPONSE', 'The Laya response exceeded the application limit.', 502) } chunks.push(value) } } finally { reader.releaseLock() }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    let raw: unknown
    try { raw = JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new LayaError('LAYA_INVALID_RESPONSE', 'The Laya server returned malformed JSON.', 502) }
    // Laya adds routing, action and entropy metadata. Validate required values and
    // normalize explicitly; never suppress upstream truncation by enabling strict mode.
    const wire = z.object({ model: z.string().min(1), answers: z.object({ classification: z.object({ type: z.literal('choice'), choice: z.string(), probabilities: z.record(z.string(), z.number()), confidence: z.number() }), impact: z.object({ type: z.literal('score'), score: z.number(), legend: z.record(z.string(), z.string()), probabilities: z.record(z.string(), z.number()), confidence: z.number() }), review: z.object({ type: z.literal('noul'), noul: z.number() }) }), usage: z.object({ input_tokens: z.number().int().nonnegative().nullable(), output_tokens: z.number().int().nonnegative().nullable(), truncated: z.boolean().optional(), state_tokens_dropped: z.number().nonnegative().optional(), truncated_questions: z.array(z.string()).optional() }) }).safeParse(raw)
    if (!wire.success) throw new LayaError('LAYA_INVALID_RESPONSE', 'The Laya server returned an invalid decision.', 502)
    const { usage, answers } = wire.data
    const normalized = DecisionSchema.safeParse({ model: wire.data.model, answers, usage: { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens }, evidenceTruncated: facts.files.length > 12 || usage.truncated === true || (usage.state_tokens_dropped ?? 0) > 0 || !!usage.truncated_questions?.length })
    if (!normalized.success) throw new LayaError('LAYA_INVALID_RESPONSE', 'The Laya server returned inconsistent probabilities or rubric values.', 502)
    return normalized.data
  } catch (error) {
    if (error instanceof LayaError) throw error
    if (controller.signal.aborted) throw new LayaError('LAYA_TIMEOUT', 'The Laya server took too long to respond. Warm up its model and retry.', 504)
    throw new LayaError('LAYA_UNAVAILABLE', 'Laya could not be reached. Start the configured model server and retry.', 502)
  } finally { clearTimeout(timer) }
}
