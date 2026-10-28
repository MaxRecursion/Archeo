import type { ChangeCategory, ChangeFacts } from '../../../src/lib/validation/changeImpact.js'
import { baselineDecision } from './mock.js'
import { applyChangeImpactPolicy, pathSignals } from './policy.js'

/** Hand-authored labels reflect scenario intent, never outputs from either baseline. */
export const EVALUATION_CASES: { id: string; paths: string[]; partial?: boolean; expectedCategory: ChangeCategory; expectedReview: boolean; rationale: string }[] = [
  { id: 'documentation', paths: ['README.md', 'docs/setup.md'], expectedCategory: 'test_or_documentation_change', expectedReview: false, rationale: 'Only explanatory prose changes.' },
  { id: 'localized-refactor', paths: ['src/utils/format.ts'], expectedCategory: 'refactor_or_maintenance', expectedReview: false, rationale: 'Synthetic scenario: extract a local helper without behavior change. Metadata alone cannot establish this intent.' },
  { id: 'public-api', paths: ['src/api/users.ts'], expectedCategory: 'api_contract_change', expectedReview: true, rationale: 'Synthetic endpoint response contract change requires consumer review.' },
  { id: 'database', paths: ['migrations/002_user.sql'], expectedCategory: 'database_or_data_model_change', expectedReview: true, rationale: 'Persisted schema migration needs human review.' },
  { id: 'authorization', paths: ['src/auth/permissions.ts'], expectedCategory: 'security_sensitive_change', expectedReview: true, rationale: 'Access enforcement boundary changes need independent checks.' },
  { id: 'dependencies', paths: ['package.json'], expectedCategory: 'dependency_change', expectedReview: true, rationale: 'Dependency changes can alter runtime behavior and supply-chain exposure; generated lockfiles are excluded before inference.' },
  { id: 'broad-behavior', paths: Array.from({ length: 15 }, (_, index) => `src/component${index}/behavior.ts`), expectedCategory: 'business_logic_change', expectedReview: true, rationale: 'Synthetic broad behavior change across fifteen components.' },
  { id: 'incomplete', paths: ['src/unknown.bin'], partial: true, expectedCategory: 'other_or_unclear', expectedReview: true, rationale: 'Intent and complete evidence unavailable.' },
  { id: 'unit-tests', paths: ['src/parser.test.ts'], expectedCategory: 'test_or_documentation_change', expectedReview: false, rationale: 'Only test assertions change.' },
  { id: 'build-maintenance', paths: ['scripts/build.ts'], expectedCategory: 'refactor_or_maintenance', expectedReview: false, rationale: 'Synthetic local build maintenance with no published runtime behavior change.' },
]

export function evaluationFacts(example: typeof EVALUATION_CASES[number]): ChangeFacts {
  return {
    repository: { owner: 'example', name: 'synthetic-changes' }, baseRef: 'main', headRef: example.id,
    baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40),
    files: example.paths.map((path) => ({ path, status: 'modified', additions: 3, deletions: 1, signals: pathSignals(path) })),
    totalChangedFiles: example.paths.length, partial: example.partial ?? false,
    warnings: example.partial ? ['Synthetic incomplete evidence.'] : [],
  }
}

export function runEvaluation() {
  const rows = EVALUATION_CASES.map((example) => {
    const facts = evaluationFacts(example)
    const decision = baselineDecision(facts)
    const policy = applyChangeImpactPolicy(facts, decision)
    const docsOnly = example.paths.every((path) => pathSignals(path).includes('test-or-documentation-path'))
    return {
      id: example.id, expectedCategory: example.expectedCategory, expectedReview: example.expectedReview,
      demoCategory: decision.answers.classification.choice, demoReview: policy.reviewRequired,
      baselineCategory: docsOnly ? 'test_or_documentation_change' : 'business_logic_change', baselineReview: !docsOnly,
    }
  })
  const metrics = (kind: 'demo' | 'baseline') => {
    const tp = rows.filter((row) => row[`${kind}Review`] && row.expectedReview).length
    const fp = rows.filter((row) => row[`${kind}Review`] && !row.expectedReview).length
    const fn = rows.filter((row) => !row[`${kind}Review`] && row.expectedReview).length
    const tn = rows.filter((row) => !row[`${kind}Review`] && !row.expectedReview).length
    return { classificationCorrect: rows.filter((row) => row[`${kind}Category`] === row.expectedCategory).length,
      classificationAccuracy: rows.filter((row) => row[`${kind}Category`] === row.expectedCategory).length / rows.length,
      reviewAccuracy: (tp + tn) / rows.length, truePositives: tp, falsePositives: fp, falseNegatives: fn, trueNegatives: tn,
      precision: tp / (tp + fp), recall: tp / (tp + fn) }
  }
  return { datasetSize: rows.length, mode: 'deterministic-demo; no live Jev measurements', demo: metrics('demo'), baseline: metrics('baseline'), rows }
}
