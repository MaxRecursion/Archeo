export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-lockup ${compact ? 'brand-compact' : ''}`} aria-label="Archeo · Codebase Archaeologist"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M10 30V18a10 10 0 0 1 20 0v12h-6V18a4 4 0 0 0-8 0v12z" fill="currentColor" /><path d="M18 24h4v6h-4z" fill="#0000EE" /></svg></span><span className="brand-name">archeo<span>.</span></span>{!compact && <span className="brand-beta">CODEBASE ARCHAEOLOGIST</span>}</div>
}
