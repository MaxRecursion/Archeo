import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowRight, Check, Code2, FileCode2, Folder, GitBranch, Layers3, LoaderCircle, LockKeyhole, MousePointer2, Network, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Brand } from '@/components/Brand'
import { useAnalysis } from '@/features/analysis/AnalysisContext'
import { analyzeRepository, ApiError } from '@/lib/api/client'

export function HomePage() {
  const navigate = useNavigate()
  const { setAnalysis, setSelectedNodeId, selectFile } = useAnalysis()
  const [repository, setRepository] = useState('')
  const [branch, setBranch] = useState('main')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function runAnalysis(value = repository, selectedBranch = branch) {
    setError('')
    setLoading(true)
    try {
      const result = await analyzeRepository(value, selectedBranch)
      setAnalysis(result)
      selectFile(null)
      setSelectedNodeId('project:root')
      navigate('/explore')
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The analysis could not be completed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runAnalysis()
  }

  return <main className="landing-page">
    <a className="skip-link" href="#repository">Skip to repository</a>
    <header className="landing-nav">
      <Brand />
      <nav aria-label="Main navigation"><a className="nav-how" href="#how-it-works">How it works <ArrowDown size={13} /></a><a className="nav-github" href="https://github.com/MaxRecursion/Archeo" target="_blank" rel="noreferrer"><GitBranch size={17} /><span>View on GitHub</span><ArrowRight size={14} /></a></nav>
    </header>
    <section className="hero-wrap">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-star" aria-hidden="true">✳</span> A fresh perspective on your code.</div>
        <h1>Understand any<br /><em>codebase.</em></h1>
        <p className="hero-subtitle">See the big picture.<br />Follow every connection.</p>
        <p className="hero-description">Turn an unfamiliar repository into a map you can explore. From the architecture to the exact line of code, find your way with confidence.</p>
        <form className="repo-form" onSubmit={submit} aria-busy={loading}>
          <div className="form-heading"><span className="form-step">01</span><span>Your exploration starts here</span></div>
          <label className="field-label" htmlFor="repository">GitHub repository</label>
          <div className="repo-input-wrap"><GitBranch size={18} aria-hidden="true" /><Input id="repository" value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="owner/repository" autoComplete="url" aria-describedby={error ? 'repository-error' : undefined} aria-invalid={Boolean(error)} disabled={loading} required /></div>
          <div className="branch-row"><div><label className="field-label" htmlFor="branch">Branch</label><div className="branch-input-wrap"><GitBranch size={15} aria-hidden="true" /><Input id="branch" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="main" disabled={loading} required /></div></div>
            <Button type="submit" disabled={loading || !repository.trim() || !branch.trim()} className="analyze-button">{loading ? <><LoaderCircle className="spin" size={17} /> Analyzing</> : <>Analyze repository <ArrowRight size={17} /></>}</Button>
          </div>
          {error && <div className="form-error" id="repository-error" role="alert">{error}</div>}
          {loading && <div className="loading-note" role="status"><LoaderCircle className="spin" size={14} /> Resolving the branch and reading source files…</div>}
          <div className="sample-row"><span>Just looking around?</span><button type="button" disabled={loading} onClick={() => { setRepository('sindresorhus/is'); setBranch('main'); void runAnalysis('sindresorhus/is', 'main') }}>Try sindresorhus/is <ArrowRight size={13} /></button></div>
        </form>
        <div className="hero-assurances"><span><Check size={13} /> Public repositories</span><span><Check size={13} /> No account needed</span></div>
      </div>
      <div className="hero-art" aria-label="Illustrative codebase dependency graph, not repository data">
        <div className="board-topbar"><span><span className="board-logo"><Network size={15} /></span> A codebase, connected.</span><span className="board-preview">EXAMPLE BOARD</span></div>
        <div className="art-canvas">
          <div className="board-sticky">Less <span>“where do I start?”</span><br />More <span>“now I get it.”</span><svg viewBox="0 0 70 50" aria-hidden="true"><path d="M7 5C5 34 37 45 60 25m-13 0 15-3-4 15" /></svg></div>
          <div className="board-view"><Layers3 size={12} /> Architecture overview</div>
          <div className="art-network">
            <svg className="art-lines" viewBox="0 0 600 410" aria-hidden="true"><path d="M172 207 C220 207 215 104 267 104"/><path d="M172 207 H267"/><path d="M172 207 C220 207 215 310 267 310"/><path d="M405 104 C443 104 435 151 469 151"/><path d="M405 207 C443 207 435 151 469 151"/><path d="M405 310 C443 310 435 270 469 270"/></svg>
            <div className="art-node project-node"><span className="art-node-kind"><Network size={13} /> PROJECT</span><strong>application</strong><span className="node-port" /></div>
            <div className="art-node module-node one"><span className="art-node-kind"><Folder size={13} /> MODULE</span><strong>components/</strong><small>12 files</small></div>
            <div className="art-node module-node two"><span className="art-node-kind"><Folder size={13} /> MODULE</span><strong>features/</strong><small>8 files</small></div>
            <div className="art-node module-node three"><span className="art-node-kind"><Folder size={13} /> MODULE</span><strong>lib/</strong><small>6 files</small></div>
            <div className="art-node file-node one"><FileCode2 size={17} /><strong>Button.tsx</strong><small>source file</small></div>
            <div className="art-node file-node two"><FileCode2 size={17} /><strong>client.ts</strong><small>source file</small></div>
            <div className="board-cursor"><MousePointer2 size={24} fill="currentColor" /><span>the big picture</span></div>
          </div>
          <div className="art-evidence"><span className="evidence-check"><ShieldCheck size={20} /></span><div><strong>Every connection has a source.</strong><small>Real files. Exact lines. A fixed commit.</small></div><span className="evidence-badge"><Check size={12} /> Verified</span></div>
          <div className="board-tools" aria-hidden="true"><MousePointer2 size={16} /><span /><Network size={17} /><Code2 size={17} /></div>
        </div>
        <div className="art-footer"><span><i className="legend-blue" />Project</span><span><i className="legend-violet" />Module</span><span><i className="legend-green" />Source</span><span className="art-disclaimer">Illustrative graph</span></div>
        <div className="board-caption">A little context changes everything.<svg viewBox="0 0 68 44" aria-hidden="true"><path d="M5 36C39 44 58 26 57 7m-10 9L57 5l6 15" /></svg></div>
      </div>
    </section>
    <section className="landing-features" aria-label="Features"><div><Network size={18} /><span>Explore the architecture</span></div><div><ShieldCheck size={18} /><span>Follow source evidence</span></div><div><LockKeyhole size={18} /><span>Your code is never executed</span></div><div><Code2 size={18} /><span>JavaScript + TypeScript</span></div></section>
    <section className="how-section" id="how-it-works">
      <div className="how-heading"><span className="section-kicker">FROM REPOSITORY TO REVELATION</span><h2>Find your way.<br />Then find your flow.</h2><p>A new project, an old codebase, or your next contribution. Start with a clearer picture.</p></div>
      <div className="how-steps"><article><span className="step-number">01 <GitBranch size={20} /></span><h3>Bring a repository.</h3><p>Paste a public GitHub link and choose a branch. We pin it to a commit, so your map has a solid foundation.</p></article><article><span className="step-number">02 <Network size={20} /></span><h3>Connect the dots.</h3><p>Explore modules, source files, and packages. Switch perspectives to see how the pieces fit together.</p></article><article><span className="step-number">03 <FileCode2 size={20} /></span><h3>Go straight to the source.</h3><p>Follow a relationship to its file and line. Read the evidence, build your understanding, and keep moving.</p></article></div>
    </section>
    <div className="scope-note"><strong>BUILT FOR EXPLORATION</strong><span>Public GitHub · JavaScript + TypeScript · static imports and exports</span><small>Explore change impact in the workspace: free deterministic demo, or operator-enabled Jev decisions. Partial evidence is explicit.</small></div>
    <footer className="landing-footer"><Brand compact /><span>Source-backed graph · optional Jev change assessment · demo needs no account</span><a href="https://github.com/MaxRecursion/Archeo" target="_blank" rel="noreferrer">Made for curious developers <ArrowRight size={13} /></a></footer>
  </main>
}
