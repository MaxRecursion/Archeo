// @vitest-environment node
import { collectChangeFacts, MAX_CHANGED_FILES, normalizeComparison } from './changeAnalysis.ts'

const base = 'a'.repeat(40), head = 'b'.repeat(40)
const row = (filename = 'src/auth.ts') => ({ filename, status: 'modified', additions: 3, deletions: 1, patch: 'DO_NOT_SEND_SECRET_CONTENT' })
function normalize(files: unknown[], status = 'ahead') {
  return normalizeComparison({ files, status }, { owner: 'acme', repository: 'demo' }, 'main', 'feature', base, head)
}

describe('bounded change metadata', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('retains only source-independent metadata and deterministic signals', () => {
    const facts = normalize([row()])
    expect(facts.files[0].signals).toContain('security-boundary-path')
    expect(JSON.stringify(facts)).not.toContain('DO_NOT_SEND_SECRET_CONTENT')
    expect(facts.partial).toBe(false)
  })
  it('filters generated files, credentials and unsafe paths and marks evidence incomplete', () => {
    const facts = normalize(['.env.local', 'cert.pem', 'node_modules/a.js', 'dist/a.js', '../a.ts', 'src\\a.ts', 'package-lock.json'].map(row))
    expect(facts.files).toHaveLength(0)
    expect(facts.partial).toBe(true)
  })
  it('bounds file count and surfaces provider truncation and divergence', () => {
    const facts = normalize(Array.from({ length: 300 }, (_, i) => row(`src/file${i}.ts`)), 'diverged')
    expect(facts.files).toHaveLength(MAX_CHANGED_FILES)
    expect(facts.partial).toBe(true)
    expect(facts.warnings.join(' ')).toContain('lower bound')
  })
  it('preserves previous sensitive path signals on rename', () => {
    const facts = normalize([{ ...row('src/util.ts'), status: 'renamed', previous_filename: 'src/auth.ts' }])
    expect(facts.files[0].signals).toContain('security-boundary-path')
    expect(facts.partial).toBe(true)
  })
  it('reports empty comparisons and rejects malformed numeric metadata', () => {
    expect(normalize([]).warnings.join(' ')).toContain('no changed files')
    expect(normalize([{ ...row(), additions: -1 }])).toMatchObject({ files: [], partial: true })
    expect(() => normalizeComparison({}, { owner: 'a', repository: 'b' }, 'main', 'next', base, head)).toThrow()
  })
  it('checks public visibility before resolving commits and rejects arbitrary fetch origins', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ private: true, default_branch: 'main', size: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(collectChangeFacts('acme/private', 'main', 'next')).rejects.toMatchObject({ status: 403 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await expect(collectChangeFacts('https://localhost/private', 'main', 'next')).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('resolves refs once and fetches the comparison using pinned SHAs', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: URL) => {
      calls.push(input.toString())
      expect(input.origin).toBe('https://api.github.com')
      if (input.pathname.endsWith('/commits/main')) return Response.json({ sha: base })
      if (input.pathname.endsWith('/commits/next')) return Response.json({ sha: head })
      if (input.pathname.includes('/compare/')) return Response.json({ status: 'ahead', files: [row('README.md')] })
      return Response.json({ private: false, default_branch: 'main', size: 1 })
    }))
    await expect(collectChangeFacts('acme/demo', 'main', 'next')).resolves.toMatchObject({ baseSha: base, headSha: head })
    expect(calls[3]).toContain(`${base}...${head}`)
  })
  it('fails closed when GitHub omits the repository visibility flag', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ default_branch: 'main', size: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(collectChangeFacts('acme/demo', 'main', 'next')).rejects.toMatchObject({ status: 502 })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
