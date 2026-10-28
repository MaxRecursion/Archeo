// @vitest-environment node
import { collectChangeFacts } from '../analysis/changeAnalysis.ts'
import { askJev, JevError } from '../jev/client.ts'
import { baselineDecision } from '../jev/mock.ts'
import { decisionCacheKey, handleChangeImpact } from './changeImpact.ts'
import type { ChangeFacts } from '../../../src/lib/validation/changeImpact.ts'

vi.mock('../analysis/changeAnalysis.ts', () => ({ collectChangeFacts: vi.fn() }))
vi.mock('../jev/client.ts', async (original) => ({ ...await original<typeof import('../jev/client.ts')>(), askJev: vi.fn() }))

const TOKEN = 'test-operator-token-'.repeat(3)
const facts: ChangeFacts = { repository: { owner: 'acme', name: 'demo' }, baseRef: 'main', headRef: 'next', baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40), files: [{ path: 'README.md', status: 'modified', additions: 2, deletions: 1, signals: ['test-or-documentation-path'] }], totalChangedFiles: 1, partial: false, warnings: [] }
let id = 0
function request(body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new Request('https://app.test/api/change-impact', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ repository: 'acme/demo', baseRef: 'main', headRef: 'next', mode: 'mock', ...body }) })
}
beforeEach(() => {
  vi.clearAllMocks()
  id += 1
  vi.mocked(collectChangeFacts).mockResolvedValue({ ...facts, headSha: id.toString(16).padStart(40, '0') })
  vi.stubEnv('CHANGE_IMPACT_ACCESS_TOKEN', TOKEN)
})
afterEach(() => vi.unstubAllEnvs())

describe('change impact server boundary', () => {
  it('serves clearly labeled demo without invoking paid inference', async () => {
    const response = await handleChangeImpact(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ mode: 'mock', decision: { model: 'deterministic-demo-v1' } })
    expect(askJev).not.toHaveBeenCalled()
  })
  it.each([{ repository: 'https://127.0.0.1/a/b' }, { baseRef: '../main' }, { headRef: 'bad?query' }, { mode: 'evil' }, { extra: true }])('rejects invalid input %j before fetching', async (body) => {
    expect((await handleChangeImpact(request(body))).status).toBe(400)
    expect(collectChangeFacts).not.toHaveBeenCalled()
  })
  it('enforces bounded request body and methods', async () => {
    expect((await handleChangeImpact(request({ repository: 'x'.repeat(9_000) }))).status).toBe(413)
    expect((await handleChangeImpact(new Request('https://app.test/api/change-impact'))).status).toBe(405)
  })
  it('fails closed when live access is unconfigured', async () => {
    vi.stubEnv('CHANGE_IMPACT_ACCESS_TOKEN', '')
    expect((await handleChangeImpact(request({ mode: 'live' }))).status).toBe(503)
    expect(askJev).not.toHaveBeenCalled()
  })
  it('requires valid operator credentials, same origin, and consent before collection', async () => {
    expect((await handleChangeImpact(request({ mode: 'live' }))).status).toBe(401)
    expect((await handleChangeImpact(request({ mode: 'live' }, { authorization: 'Bearer wrong' }))).status).toBe(403)
    expect((await handleChangeImpact(request({ mode: 'live', consent: true }, { authorization: `Bearer ${TOKEN}`, origin: 'https://evil.test' }))).status).toBe(403)
    expect((await handleChangeImpact(request({ mode: 'live' }, { authorization: `Bearer ${TOKEN}` }))).status).toBe(403)
    expect(collectChangeFacts).not.toHaveBeenCalled()
  })
  it('returns a validated live result with policy and reuses the cached immutable decision', async () => {
    vi.mocked(askJev).mockResolvedValue({ ...baselineDecision(facts), model: 'jev-1.14.0' })
    const req = () => request({ mode: 'live', consent: true }, { authorization: `Bearer ${TOKEN}` })
    const response = await handleChangeImpact(req())
    expect(await response.json()).toMatchObject({ mode: 'live', cached: false })
    expect(await (await handleChangeImpact(req())).json()).toMatchObject({ mode: 'live', cached: true })
    expect(askJev).toHaveBeenCalledTimes(1)
  })
  it.each(['JEV_AUTHENTICATION', 'JEV_RATE_LIMITED', 'JEV_TIMEOUT', 'JEV_INVALID_RESPONSE', 'JEV_UNAVAILABLE', 'JEV_FORBIDDEN'] as const)('preserves deterministic evidence on %s', async (code) => {
    vi.mocked(askJev).mockRejectedValue(new JevError(code, 'Safe upstream failure.', 502))
    const response = await handleChangeImpact(request({ mode: 'live', consent: true }, { authorization: `Bearer ${TOKEN}` }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ mode: 'unavailable', facts: { files: facts.files }, decision: null, policy: { reviewRequired: true, uncertain: true }, error: { code } })
  })
  it('redacts unexpected upstream messages', async () => {
    vi.mocked(askJev).mockRejectedValue(new Error('secret-do-not-expose'))
    const response = await handleChangeImpact(request({ mode: 'live', consent: true }, { authorization: `Bearer ${TOKEN}` }))
    expect(await response.text()).not.toContain('secret-do-not-expose')
  })
  it('isolates cache by identity, model, actor, mode and evidence', () => {
    const key = decisionCacheKey(facts, 'live', 'alice', 'jev-1.14.0')
    expect(decisionCacheKey(facts, 'live', 'alice', 'jev-1.14.0')).toBe(key)
    for (const other of [decisionCacheKey(facts, 'mock', 'alice', 'jev-1.14.0'), decisionCacheKey(facts, 'live', 'bob', 'jev-1.14.0'), decisionCacheKey(facts, 'live', 'alice', 'jev-latest'), decisionCacheKey({ ...facts, partial: true }, 'live', 'alice', 'jev-1.14.0')]) expect(other).not.toBe(key)
  })
})
