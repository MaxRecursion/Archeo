import { z } from 'zod'

export const CATEGORY_LABELS = {
  api_contract_change: 'API contract change',
  security_sensitive_change: 'Security-sensitive change',
  database_or_data_model_change: 'Database or data model change',
  dependency_change: 'Dependency change',
  business_logic_change: 'Business logic change',
  refactor_or_maintenance: 'Refactor or maintenance',
  test_or_documentation_change: 'Test or documentation change',
  other_or_unclear: 'Other or unclear',
} as const

export const IMPACT_LEVELS = [
  'Localized change with limited expected impact.',
  'Limited impact across a small part of the application.',
  'Meaningful impact on a component or its dependencies.',
  'Broad impact across multiple components or public contracts.',
  'Potentially critical impact requiring careful review.',
] as const

const probability = z.number().finite().min(0).max(1)
const sha = z.string().regex(/^[a-f0-9]{40}$/i)
const CategorySchema = z.enum(Object.keys(CATEGORY_LABELS) as [keyof typeof CATEGORY_LABELS, ...(keyof typeof CATEGORY_LABELS)[]])
export type ChangeCategory = z.infer<typeof CategorySchema>

export const ChangeFactsSchema = z.object({
  repository: z.object({ owner: z.string().min(1).max(39), name: z.string().min(1).max(100) }).strict(),
  baseSha: sha,
  headSha: sha,
  baseRef: z.string().min(1).max(200),
  headRef: z.string().min(1).max(200),
  files: z.array(z.object({
    path: z.string().min(1).max(300),
    status: z.string().min(1).max(30),
    additions: z.number().int().nonnegative().max(10_000_000),
    deletions: z.number().int().nonnegative().max(10_000_000),
    signals: z.array(z.string().max(100)).max(10),
  }).strict()).max(60),
  totalChangedFiles: z.number().int().nonnegative().max(10_000_000),
  partial: z.boolean(),
  warnings: z.array(z.string().min(1).max(400)).max(20),
}).strict().refine((facts) => facts.totalChangedFiles >= facts.files.length, 'Changed-file total cannot be smaller than the evidence set.')

const ChoiceProbabilitiesSchema = z.object({
  api_contract_change: probability,
  security_sensitive_change: probability,
  database_or_data_model_change: probability,
  dependency_change: probability,
  business_logic_change: probability,
  refactor_or_maintenance: probability,
  test_or_documentation_change: probability,
  other_or_unclear: probability,
}).strict()
const ScoreProbabilitiesSchema = z.object({ '0': probability, '1': probability, '2': probability, '3': probability, '4': probability }).strict()
const ScoreLegendSchema = z.object({
  '0': z.literal(IMPACT_LEVELS[0]), '1': z.literal(IMPACT_LEVELS[1]), '2': z.literal(IMPACT_LEVELS[2]),
  '3': z.literal(IMPACT_LEVELS[3]), '4': z.literal(IMPACT_LEVELS[4]),
}).strict()

export const JevDecisionSchema = z.object({
  model: z.string().min(1).max(100),
  answers: z.object({
    classification: z.object({ type: z.literal('choice'), choice: CategorySchema, probabilities: ChoiceProbabilitiesSchema, confidence: probability }).strict(),
    impact: z.object({ type: z.literal('score'), score: z.number().finite().min(0).max(4), legend: ScoreLegendSchema, probabilities: ScoreProbabilitiesSchema, confidence: probability }).strict(),
    review: z.object({ type: z.literal('noul'), noul: probability }).strict(),
  }).strict(),
  usage: z.object({ input_tokens: z.number().int().nonnegative().nullable(), output_tokens: z.number().int().nonnegative().nullable() }).strict(),
}).strict().superRefine((decision, ctx) => {
  const { classification, impact } = decision.answers
  for (const [name, values] of [['classification', Object.values(classification.probabilities)], ['impact', Object.values(impact.probabilities)]] as const) {
    if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > 0.005) ctx.addIssue({ code: 'custom', message: `${name} probabilities must sum to one.` })
  }
  if (classification.probabilities[classification.choice] + 0.005 < Math.max(...Object.values(classification.probabilities))) ctx.addIssue({ code: 'custom', message: 'Choice must have maximal probability.' })
  const expected = Object.entries(impact.probabilities).reduce((sum, [level, p]) => sum + Number(level) * p, 0)
  if (Math.abs(impact.score - expected) > 0.02) ctx.addIssue({ code: 'custom', message: 'Score must match its probability-weighted rubric position.' })
})

export const ImpactResponseSchema = z.object({
  facts: ChangeFactsSchema,
  mode: z.enum(['mock', 'live', 'unavailable']),
  decision: JevDecisionSchema.nullable(),
  policy: z.object({ reviewRequired: z.boolean(), reasons: z.array(z.string().max(400)).max(20), uncertain: z.boolean() }).strict(),
  error: z.object({ code: z.string().max(60), message: z.string().max(400) }).strict().optional(),
  cached: z.boolean(),
  latencyMs: z.number().finite().nonnegative(),
}).strict().refine((result) => result.mode === 'unavailable' ? result.decision === null : result.decision !== null, 'Mode must match decision availability.')

export type ChangeFacts = z.infer<typeof ChangeFactsSchema>
export type JevDecision = z.infer<typeof JevDecisionSchema>
export type ImpactResponse = z.infer<typeof ImpactResponseSchema>
