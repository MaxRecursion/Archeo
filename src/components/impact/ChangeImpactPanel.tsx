import { useState, type FormEvent } from 'react'
import { AlertTriangle, GitCompareArrows, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiErrorSchema, type AnalysisResultData } from '@/lib/validation/schemas'
import { CATEGORY_LABELS, IMPACT_LEVELS, ImpactResponseSchema, type ImpactResponse } from '@/lib/validation/changeImpact'

const percentage = (value: number) => `${(value * 100).toFixed(1)}%`

export function ChangeImpactPanel({ analysis }: { analysis: AnalysisResultData }) {
  const [baseRef, setBaseRef] = useState('main')
  const [headRef, setHeadRef] = useState(analysis.commitSha)
  const [live, setLive] = useState(false)
  const [consent, setConsent] = useState(false)
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImpactResponse | null>(null)
  const repository = `${analysis.repository.owner}/${analysis.repository.name}`

  function clearResult() { setResult(null); setError('') }

  async function assess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    clearResult()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 35_000)
    try {
      const response = await fetch('/api/change-impact', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(live && accessToken.trim() ? { authorization: `Bearer ${accessToken.trim()}` } : {}) },
        body: JSON.stringify({ repository, baseRef: baseRef.trim(), headRef: headRef.trim(), mode: live ? 'live' : 'mock', consent: live && consent }),
        signal: controller.signal,
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const parsed = ApiErrorSchema.safeParse(payload)
        throw new Error(parsed.success ? parsed.data.error : 'Change impact analysis could not be completed. Try again.')
      }
      const parsed = ImpactResponseSchema.safeParse(payload)
      if (!parsed.success) throw new Error('The impact service returned an unexpected response. Try again shortly.')
      setResult(parsed.data)
    } catch (cause) {
      setError(controller.signal.aborted ? 'Change impact analysis timed out. Try a smaller comparison.' : cause instanceof Error ? cause.message : 'Change impact analysis is unavailable. Try again shortly.')
    } finally {
      window.clearTimeout(timer)
      setLoading(false)
    }
  }

  const decision = result?.facts.totalChangedFiles ? result.decision : null
  return <section className="impact-panel" aria-labelledby="impact-title" id="change-impact">
    <div className="impact-heading"><GitCompareArrows size={17} /><div><div className="panel-kicker">CHANGE IMPACT INTELLIGENCE</div><h2 id="impact-title">Assess a proposed change</h2></div></div>
    <p className="impact-intro">Compare two branches or commits in {repository}. Deterministic analysis collects public file metadata; Jev can make typed decisions about that evidence.</p>
    <form onSubmit={assess} aria-label="Change impact analysis">
      <div className="impact-ref-fields">
        <label>Base branch or commit<Input value={baseRef} onChange={(event) => { setBaseRef(event.target.value); clearResult() }} required maxLength={200} disabled={loading} placeholder="main" /></label>
        <label>Head branch or commit<Input value={headRef} onChange={(event) => { setHeadRef(event.target.value); clearResult() }} required maxLength={200} disabled={loading} placeholder="feature-branch" /></label>
      </div>
      <label className="impact-checkbox"><input type="checkbox" checked={live} disabled={loading} onChange={(event) => { setLive(event.target.checked); setConsent(false); clearResult() }} />Use live Jev (requires operator access)</label>
      {live ? <div className="impact-live-settings">
        <label>Operator access token<Input type="password" autoComplete="off" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} required disabled={loading} placeholder="Server operator access token" /></label>
        <p>This is the deployment operator token, separate from the TypeSafe API key. It stays in this page’s memory.</p>
        <label className="impact-checkbox"><input type="checkbox" checked={consent} disabled={loading} required onChange={(event) => setConsent(event.target.checked)} />I consent to sending this public repository’s filenames, change counts, and path signals to TypeSafe AI.</label>
        <p>Source code, patches, and private repositories are excluded. Review <a href="https://typesafe.ai/legal/privacy-policy" target="_blank" rel="noreferrer">TypeSafe’s privacy policy</a> before enabling live analysis.</p>
      </div> : <p className="impact-mode-note">Demo mode: real GitHub comparison metadata with simulated decision outputs. No Jev request or paid inference.</p>}
      <div className="impact-submit"><Button type="submit" variant="secondary" size="sm" disabled={loading || !baseRef.trim() || !headRef.trim() || (live && (!consent || !accessToken.trim()))}>{loading && <LoaderCircle size={14} className="spin" />}{loading ? 'Assessing changes…' : result ? 'Rerun change impact' : 'Analyze change impact'}</Button><span>No source code is executed or sent to Jev.</span></div>
    </form>
    {loading && <p role="status" className="impact-notice">Resolving commits and collecting bounded change evidence…</p>}
    {error && <p role="alert" className="impact-error"><AlertTriangle size={14} />{error}</p>}
    {result && <div className="impact-result" aria-live="polite">
      <div className={`impact-result-mode impact-mode-${result.mode}`}>{result.mode === 'mock' ? 'DEMO · SIMULATED DECISIONS · NOT LIVE JEV' : result.mode === 'live' ? 'LIVE JEV · TYPESAFE AI' : 'JEV UNAVAILABLE · DETERMINISTIC EVIDENCE ONLY'}</div>
      <p className="impact-identity">{repository} · {result.facts.baseRef} <code>{result.facts.baseSha.slice(0, 10)}</code> → {result.facts.headRef} <code>{result.facts.headSha.slice(0, 10)}</code></p>
      {result.facts.totalChangedFiles === 0 && <p className="impact-notice">No changed files in this comparison. Choose a different base or head to assess a proposed change.</p>}
      {result.error && <p className="impact-error" role="alert"><AlertTriangle size={14} />{result.error.message} ({result.error.code})</p>}
      {decision && <div className="impact-decisions">
        <div><span>Change classification · Choice</span><strong>{CATEGORY_LABELS[decision.answers.classification.choice]}</strong><small>{result.mode === 'mock' ? 'Simulated confidence' : 'Model confidence'}: {percentage(decision.answers.classification.confidence)}</small></div>
        <div><span>Potential impact · Score</span><strong>{decision.answers.impact.score.toFixed(2)} / 4</strong><small>Continuous rubric position · confidence: {percentage(decision.answers.impact.confidence)}</small></div>
        <div><span>Human review judgment · Noul</span><strong>{percentage(decision.answers.review.noul)}</strong><small>Probability that review is warranted</small></div>
      </div>}
      <div className="impact-policy"><strong>{result.policy.reviewRequired ? 'Human review recommended' : 'No additional review triggered by this policy'}</strong><p>Deterministic application policy. This assessment never approves or merges code.</p>{result.policy.uncertain && <p className="impact-uncertain"><AlertTriangle size={14} />Uncertain or incomplete assessment. Inspect the evidence before acting.</p>}{result.policy.reasons.length > 0 && <ul>{result.policy.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}</div>
      <details className="impact-details"><summary>Deterministic evidence ({result.facts.files.length} of {result.facts.totalChangedFiles} changed files)</summary>
        <p>Path signals are heuristics, not verified vulnerabilities or semantic code analysis.</p>
        {result.facts.partial && <p className="impact-uncertain">Partial analysis: the evidence does not cover the complete change.</p>}
        {result.facts.warnings.length > 0 && <ul>{result.facts.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
        <div className="impact-evidence-scroll"><table><caption>GitHub comparison metadata</caption><thead><tr><th scope="col">File</th><th scope="col">Status</th><th scope="col">Lines</th><th scope="col">Path signals</th></tr></thead><tbody>{result.facts.files.map((file) => <tr key={file.path}><th scope="row"><code>{file.path}</code></th><td>{file.status}</td><td>+{file.additions} / −{file.deletions}</td><td>{file.signals.join(', ') || 'None'}</td></tr>)}</tbody></table></div>
      </details>
      <details className="impact-details"><summary>Impact rubric and model distributions</summary><ol start={0}>{IMPACT_LEVELS.map((level, index) => <li key={level}><strong>Level {index}:</strong> {level}</li>)}</ol><p>Score is the probability-weighted position on this ordered rubric. It is neither an integer severity nor a percentage.</p>
        {decision && <><h3>Choice probabilities</h3><ul>{Object.entries(decision.answers.classification.probabilities).map(([label, value]) => <li key={label}>{CATEGORY_LABELS[label as keyof typeof CATEGORY_LABELS]}: {percentage(value)}</li>)}</ul><h3>Score level probabilities</h3><ul>{Object.entries(decision.answers.impact.probabilities).map(([level, value]) => <li key={level}>Level {level}: {percentage(value)}</li>)}</ul><p>Noul is the probability of a yes judgment; it has no separate confidence field.</p><p>Model: <code>{decision.model}</code> · Input tokens: {decision.usage.input_tokens ?? 'unavailable'} · Output tokens: {decision.usage.output_tokens ?? 'unavailable'}</p></>}
      </details>
      <p className="impact-timing">Assessment: {result.latencyMs.toFixed(0)} ms{result.cached ? ' · reused cached decision' : ''}. {result.mode === 'mock' ? 'Demo probabilities illustrate the interface and do not measure Jev performance.' : 'Model judgments depend on the limited evidence supplied.'}</p>
    </div>}
  </section>
}
