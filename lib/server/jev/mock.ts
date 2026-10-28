import { CATEGORY_LABELS, IMPACT_LEVELS, JevDecisionSchema, type ChangeCategory, type ChangeFacts, type JevDecision } from '../../../src/lib/validation/changeImpact.js'
import { pathSignals } from './policy.js'

/** Deterministic demonstration only. No Jev inference or measured model probabilities. */
export function baselineDecision(facts: ChangeFacts): JevDecision {
  const signals = facts.files.flatMap((file) => [...pathSignals(file.path), ...file.signals])
  let category: ChangeCategory = 'business_logic_change'
  let level = facts.files.length > 12 ? 3 : facts.files.length > 3 ? 2 : 1
  if (facts.partial || !facts.files.length) category = 'other_or_unclear'
  else if (signals.includes('security-boundary-path')) { category = 'security_sensitive_change'; level = 4 }
  else if (signals.includes('data-model-path')) { category = 'database_or_data_model_change'; level = 3 }
  else if (signals.includes('api-contract-path')) { category = 'api_contract_change'; level = 3 }
  else if (facts.files.every((file) => pathSignals(file.path).includes('test-or-documentation-path'))) { category = 'test_or_documentation_change'; level = 0 }
  else if (signals.includes('dependency-manifest')) { category = 'dependency_change'; level = 2 }
  else if (facts.files.every((file) => pathSignals(file.path).includes('maintenance-path'))) { category = 'refactor_or_maintenance'; level = 1 }
  if (facts.partial) level = Math.max(level, 2)
  const confidence = category === 'other_or_unclear' ? 0.2 : 0.85
  const labels = Object.keys(CATEGORY_LABELS) as ChangeCategory[]
  const probabilities = Object.fromEntries(labels.map((key) => [key, key === category ? 0.86 : 0.02]))
  const impactProbabilities = Object.fromEntries(IMPACT_LEVELS.map((_, index) => [String(index), index === level ? 1 : 0]))
  return JevDecisionSchema.parse({
    model: 'deterministic-demo-v1',
    answers: {
      classification: { type: 'choice', choice: category, probabilities, confidence },
      impact: { type: 'score', score: level, probabilities: impactProbabilities, legend: Object.fromEntries(IMPACT_LEVELS.map((text, index) => [String(index), text])), confidence },
      review: { type: 'noul', noul: facts.partial || category === 'other_or_unclear' ? 0.5 : level >= 2 ? 0.9 : category === 'test_or_documentation_change' ? 0.05 : 0.2 },
    },
    usage: { input_tokens: null, output_tokens: null },
  })
}
