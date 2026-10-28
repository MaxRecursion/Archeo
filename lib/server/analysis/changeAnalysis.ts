import type { ChangeFacts } from '../../../src/lib/validation/changeImpact.js'
import { pathSignals } from '../jev/policy.js'
import { GitHubClient } from '../github/client.js'
import { SafeError } from '../security/errors.js'
import { parseRepository, validateBranch, validateRepositoryPath } from '../security/validation.js'

export const MAX_CHANGED_FILES = 60
const EXCLUDED = /(^|\/)(node_modules|dist|build|coverage|vendor|\.git)(\/|$)|(^|\/)(\.env(?:\..*)?|[^/]*\.(?:pem|key|p12|pfx))$|(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$|\.min\.[cm]?js$|\.map$/i

export function normalizeComparison(raw: Record<string, unknown>, identity: { owner: string; repository: string }, baseRef: string, headRef: string, baseSha: string, headSha: string): ChangeFacts {
  if (!Array.isArray(raw.files) || typeof raw.status !== 'string') throw new SafeError('GITHUB_UNAVAILABLE', 'GitHub returned incomplete comparison metadata.', 502)
  const warnings = ['Filename signals are heuristics, not source-level findings. Dependencies and runtime behavior are not evaluated by this comparison.']
  let partial = raw.files.length >= 300 || raw.files.length > MAX_CHANGED_FILES || raw.status === 'diverged' || raw.status === 'behind'
  if (raw.files.length >= 300) warnings.push('GitHub comparison results may be truncated at 300 files; totalChangedFiles is a lower bound.')
  if (raw.status === 'diverged' || raw.status === 'behind') warnings.push('GitHub compares from the merge base; the selected refs are not a simple forward change.')
  const files: ChangeFacts['files'] = []
  for (const row of raw.files as unknown[]) {
    if (!row || typeof row !== 'object') { partial = true; continue }
    const file = row as Record<string, unknown>
    const path = file.filename
    if (typeof path !== 'string' || !validateRepositoryPath(path) || path.length > 300 || EXCLUDED.test(path)) { partial = true; continue }
    if (files.length >= MAX_CHANGED_FILES) { partial = true; continue }
    if (typeof file.status !== 'string' || !['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged'].includes(file.status)) { partial = true; continue }
    if (![file.additions, file.deletions].every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10_000_000)) { partial = true; continue }
    const signals = pathSignals(path)
    if (file.status === 'renamed') {
      // A rename can conceal a previous security-sensitive path. Never infer safety from the new path alone.
      partial = true
      if (typeof file.previous_filename === 'string' && validateRepositoryPath(file.previous_filename)) signals.push(...pathSignals(file.previous_filename))
    }
    files.push({ path, status: file.status, additions: file.additions as number, deletions: file.deletions as number, signals: [...new Set(signals)] })
  }
  files.sort((a, b) => a.path.localeCompare(b.path))
  if (partial) warnings.push('Evidence is incomplete: excluded, renamed, invalid or excess files and/or a non-forward comparison. Human review is required.')
  if (files.length === 0) warnings.push(raw.files.length ? 'No eligible files remain after filtering.' : 'The comparison contains no changed files.')
  return { repository: { owner: identity.owner, name: identity.repository }, baseRef, headRef, baseSha, headSha, files, totalChangedFiles: raw.files.length, partial, warnings }
}

export async function collectChangeFacts(repository: string, baseRef: string, headRef: string): Promise<ChangeFacts> {
  const identity = { ...parseRepository(repository), branch: validateBranch(headRef) }
  validateBranch(baseRef)
  const client = new GitHubClient(Date.now() + 14_000)
  const repo = await client.repository(identity)
  if (repo.private) throw new SafeError('UNSUPPORTED_REPOSITORY', 'Only public repositories can be analyzed.', 403)
  const [baseSha, headSha] = await Promise.all([client.commit(identity, baseRef), client.commit(identity, headRef)])
  const raw = await client.compare(identity, baseSha, headSha)
  return normalizeComparison(raw, identity, baseRef, headRef, baseSha, headSha)
}
