import { APIConnectionError, APIError, APITimeoutError, APIUserAbortError, TypeSafeClient, TypeSafeError, type Fetch } from '@typesafe-ai/sdk'
import { ChangeFactsSchema, JevDecisionSchema, type ChangeFacts, type JevDecision } from '../../../src/lib/validation/changeImpact.js'
import { changeImpactQuestions, JEV_MODEL } from './questions.js'

export type JevErrorCode = 'JEV_AUTHENTICATION' | 'JEV_FORBIDDEN' | 'JEV_RATE_LIMITED' | 'JEV_TIMEOUT' | 'JEV_UNAVAILABLE' | 'JEV_INVALID_RESPONSE' | 'JEV_INVALID_REQUEST'
export class JevError extends Error {
  constructor(public readonly code: JevErrorCode, message: string, public readonly status: number, public readonly retryAfterSeconds?: number) { super(message); this.name = 'JevError' }
}

export interface JevOptions { apiKey?: string; model?: string; fetch?: Fetch; timeoutMs?: number }

export async function askJev(input: ChangeFacts, options: JevOptions = {}): Promise<JevDecision> {
  const facts = ChangeFactsSchema.parse(input)
  if (new TextEncoder().encode(JSON.stringify(facts)).byteLength > 32 * 1_024) throw new JevError('JEV_INVALID_REQUEST', 'The normalized evidence exceeds the application state limit.', 413)
  const apiKey = options.apiKey ?? process.env.TYPESAFE_API_KEY
  if (!apiKey) throw new JevError('JEV_AUTHENTICATION', 'The server has no TypeSafe API key configured.', 503)
  const model = options.model ?? process.env.TYPESAFE_MODEL ?? JEV_MODEL
  if (!/^jev-(?:\d+\.\d+\.\d+|latest|preview)$/.test(model)) throw new JevError('JEV_INVALID_REQUEST', 'The server Jev model setting is invalid.', 503)
  // Explicit settings prevent inherited SDK environment overrides from changing the origin or logging bodies.
  const transport = options.fetch ?? globalThis.fetch
  const client = new TypeSafeClient({ apiKey, baseURL: 'https://api.typesafe.ai', defaultModel: model,
    timeout: options.timeoutMs ?? 8_000, retry: { maxRetries: 0 }, compression: false,
    logLevel: 'off', fetch: async (url, init) => boundedResponse(await transport(url, init)),
  })
  try {
    const result: unknown = await client.systemOne({ state: facts, questions: changeImpactQuestions, model })
    const parsed = JevDecisionSchema.safeParse(result)
    if (!parsed.success) throw new JevError('JEV_INVALID_RESPONSE', 'TypeSafe returned an invalid decision. Use the deterministic evidence and retry later.', 502)
    if (/^jev-\d/.test(model) && parsed.data.model !== model) throw new JevError('JEV_INVALID_RESPONSE', 'TypeSafe returned a different model version than requested.', 502)
    return parsed.data
  } catch (error) {
    if (error instanceof JevError) throw error
    if (error instanceof APIConnectionError && error.cause instanceof JevError) throw error.cause
    if (error instanceof APITimeoutError || error instanceof APIUserAbortError) throw new JevError('JEV_TIMEOUT', 'TypeSafe took too long to respond.', 504)
    if (error instanceof APIError) {
      if (error.status === 401) throw new JevError('JEV_AUTHENTICATION', 'TypeSafe rejected the server credentials.', 502)
      if (error.status === 402 || error.status === 403) throw new JevError('JEV_FORBIDDEN', 'The TypeSafe account cannot access this operation. Check account access and available credits in the console.', 502)
      if (error.status === 429) throw new JevError('JEV_RATE_LIMITED', 'TypeSafe usage is limited. Retry later.', 429, retryAfterSeconds(error.headers.get('retry-after')))
      if (error.status === 400 || error.status === 422 || error.status === 413) throw new JevError('JEV_INVALID_REQUEST', 'TypeSafe rejected the bounded analysis request.', 502)
    }
    if (error instanceof TypeSafeError && !(error instanceof APIConnectionError) && !(error instanceof APIError)) throw new JevError('JEV_INVALID_RESPONSE', 'TypeSafe returned an invalid decision.', 502)
    // Never forward upstream bodies, SDK messages, stack traces, headers or source content.
    throw new JevError('JEV_UNAVAILABLE', 'TypeSafe is temporarily unavailable. Deterministic evidence is still available.', 502)
  }
}

function retryAfterSeconds(value: string | null): number {
  if (!value) return 60
  const seconds = Number(value)
  const delay = Number.isFinite(seconds) ? seconds : (Date.parse(value) - Date.now()) / 1_000
  return Number.isFinite(delay) ? Math.max(1, Math.min(86_400, Math.ceil(delay))) : 60
}

async function boundedResponse(response: Response): Promise<Response> {
  const maxBytes = 64 * 1_024
  if (Number(response.headers.get('content-length') ?? 0) > maxBytes) {
    await response.body?.cancel()
    throw new JevError('JEV_INVALID_RESPONSE', 'TypeSafe returned a response larger than the application limit.', 502)
  }
  if (!response.body) return response
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new JevError('JEV_INVALID_RESPONSE', 'TypeSafe returned a response larger than the application limit.', 502)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers })
}
