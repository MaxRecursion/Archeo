import type { ChangeFacts, JevDecision, ImpactResponse } from '../../../src/lib/validation/changeImpact.js'

export const POLICY_VERSION = 'review-policy-v1'

export function pathSignals(path: string): string[] {
  const signals: string[] = []
  if (/(?:^|[/_.-])(auth|authn|authz|authentication|authorization|oauth|login|permissions?|session|secrets?|credentials?|password|crypto|security|validation|middleware)(?:[/_.-]|$)/i.test(path)) signals.push('security-boundary-path')
  if (/(?:^|\/)(api|routes?|contracts?)(?:\/|\.)|openapi|swagger/i.test(path)) signals.push('api-contract-path')
  if (/(?:^|\/)(migrations?|schema|models?|prisma)(?:\/|\.)|\.sql$/i.test(path)) signals.push('data-model-path')
  if (/(?:^|\/)(package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|requirements[^/]*|Cargo\.(?:toml|lock)|go\.(?:mod|sum))$/i.test(path)) signals.push('dependency-manifest')
  if (/(?:^|\/)(docs?|tests?|__tests__)(?:\/|$)|(?:\.test|\.spec)\.|\.(?:md|mdx|rst|txt)$/i.test(path)) signals.push('test-or-documentation-path')
  if (/(?:^|\/)(vite\.config|tsconfig|eslint|\.github|scripts?)(?:[/_.-]|$)/i.test(path)) signals.push('maintenance-path')
  return signals
}

export function applyChangeImpactPolicy(facts: ChangeFacts, decision: JevDecision | null): ImpactResponse['policy'] {
  const reasons: string[] = []
  let uncertain = facts.partial || facts.files.length === 0
  if (facts.partial) reasons.push('The evidence is incomplete; inspect the full change before deciding.')
  if (facts.files.length === 0) reasons.push('No analyzable changed-file evidence is available.')
  if (facts.files.some((file) => [...pathSignals(file.path), ...file.signals].includes('security-boundary-path'))) reasons.push('A security-sensitive path changed; run independent checks and request human review. This is a path heuristic, not a vulnerability finding.')
  if (!decision) {
    uncertain = true
    reasons.push('The Jev assessment is unavailable; deterministic evidence remains available.')
  } else {
    const { classification, impact, review } = decision.answers
    if (impact.score >= 2.5) reasons.push('Potential impact meets the application review threshold (2.5 on the 0–4 rubric).')
    if (review.noul >= 0.6) reasons.push('The model probability that review is warranted meets the application threshold (60%).')
    if (classification.choice === 'security_sensitive_change') reasons.push('The decision identifies a possible sensitive boundary; independent checks and human review are needed.')
    if (classification.confidence < 0.6 || impact.confidence < 0.6 || (review.noul > 0.35 && review.noul < 0.65) || classification.choice === 'other_or_unclear') {
      uncertain = true
      reasons.push('Ambiguous model signals require interpretation by a reviewer.')
    }
    if ((review.noul < 0.35 && impact.score >= 2.5) || (review.noul >= 0.65 && impact.score < 1)) {
      uncertain = true
      reasons.push('Impact and review signals disagree; inspect the evidence.')
    }
  }
  const reviewRequired = reasons.length > 0
  if (!reviewRequired) reasons.push('No escalation threshold was reached. This assessment does not approve a merge or establish that code is safe.')
  return { reviewRequired, reasons, uncertain }
}
