import { expect, test, type Page } from '@playwright/test'
import { CATEGORY_LABELS, IMPACT_LEVELS, type ImpactResponse } from '../../src/lib/validation/changeImpact'

const HEAD = 'a'.repeat(40)
const BASE = 'b'.repeat(40)
const analysis = {
  repository: { owner: 'sample', name: 'project', url: 'https://github.com/sample/project' },
  requestedBranch: 'main', commitSha: HEAD, commitUrl: `https://github.com/sample/project/commit/${HEAD}`,
  analyzedAt: '2026-10-28T08:00:00.000Z', analyzerVersion: '0.1.0', partial: false, warnings: [],
  counts: { discoveredFiles: 1, analyzedFiles: 1, skippedFiles: 0, sourceBytes: 20, modules: 1, internalDependencies: 0, externalDependencies: 0, unresolvedDependencies: 0 },
  languages: [{ name: 'TypeScript', files: 1 }], frameworks: [], packageManagers: ['npm'],
  files: [{ path: 'src/auth.ts', blobSha: BASE, size: 20, language: 'TypeScript', analyzed: true }],
  nodes: [{ id: 'project:root', type: 'project', label: 'project' }], edges: [],
}

const decision: NonNullable<ImpactResponse['decision']> = {
  model: 'deterministic-demo-v1',
  answers: {
    classification: { type: 'choice', choice: 'security_sensitive_change', confidence: 0.8, probabilities: Object.fromEntries(Object.keys(CATEGORY_LABELS).map((key) => [key, key === 'security_sensitive_change' ? 0.72 : 0.04])) as NonNullable<ImpactResponse['decision']>['answers']['classification']['probabilities'] },
    impact: { type: 'score', score: 2.5, legend: Object.fromEntries(IMPACT_LEVELS.map((level, index) => [String(index), level])) as NonNullable<ImpactResponse['decision']>['answers']['impact']['legend'], probabilities: { '0': 0, '1': 0, '2': 0.5, '3': 0.5, '4': 0 }, confidence: 0.7 },
    review: { type: 'noul', noul: 0.87 },
  },
  usage: { input_tokens: null, output_tokens: null },
}
const impact: ImpactResponse = {
  facts: { repository: { owner: 'sample', name: 'project' }, baseSha: BASE, headSha: HEAD, baseRef: 'main', headRef: HEAD, totalChangedFiles: 1, partial: false, warnings: [], files: [{ path: 'src/auth.ts', status: 'modified', additions: 12, deletions: 3, signals: ['security-sensitive-path'] }] },
  mode: 'mock', decision, policy: { reviewRequired: true, reasons: ['Security-sensitive paths require independent checks and human review.'], uncertain: true }, cached: false, latencyMs: 15,
}

async function enterWorkspace(page: Page) {
  await page.route('**/api/analyze', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analysis) }))
  await page.goto('/')
  await page.getByRole('button', { name: /sindresorhus\/is/ }).click()
  await expect(page.getByRole('heading', { name: 'Assess a proposed change' })).toBeVisible()
}

test('demo assessment shows provenance, continuous score, Noul probability, evidence, and rerun', async ({ page }) => {
  let request: unknown
  await page.route('**/api/change-impact', async (route) => {
    request = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(impact) })
  })
  await enterWorkspace(page)
  await page.getByLabel('Base branch or commit').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('DEMO · SIMULATED DECISIONS · NOT LIVE JEV')).toBeVisible()
  expect(request).toEqual({ repository: 'sample/project', baseRef: 'main', headRef: HEAD, mode: 'mock', consent: false })
  await expect(page.getByText('2.50 / 4')).toBeVisible()
  await expect(page.getByText('87.0%', { exact: true })).toBeVisible()
  await expect(page.getByText('Probability that review is warranted')).toBeVisible()
  await expect(page.getByText('Human review recommended', { exact: true })).toBeVisible()
  await page.getByText('Deterministic evidence (1 of 1 changed files)').click()
  await expect(page.getByRole('cell', { name: 'security-sensitive-path' })).toBeVisible()
  await page.getByText('Impact rubric and model distributions').click()
  await expect(page.getByText(/Score is the probability-weighted position/)).toBeVisible()
  await expect(page.getByText('Security-sensitive change: 72.0%')).toBeVisible()
  await page.locator('.impact-panel').screenshot({ path: test.info().outputPath('change-impact-desktop.png') })
  await page.getByRole('button', { name: 'Rerun change impact' }).click()
  await expect(page.getByText('DEMO · SIMULATED DECISIONS · NOT LIVE JEV')).toBeVisible()
})

test('loading and rate-limit errors remain useful and preserve architecture', async ({ page }) => {
  let release: () => void = () => {}
  const paused = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/change-impact', async (route) => {
    await paused
    await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Analysis rate limit reached. Try again later.', code: 'RATE_LIMITED' }) })
  })
  await enterWorkspace(page)
  await page.getByRole('button', { name: 'Analyze change impact' }).click()
  await expect(page.getByRole('button', { name: 'Assessing changes…' })).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('Resolving commits')
  release()
  await expect(page.getByRole('alert')).toContainText('Analysis rate limit reached')
  await expect(page.getByRole('region', { name: 'Architecture graph' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analyze change impact' })).toBeEnabled()
})

test('unavailable service shows deterministic fallback and incomplete evidence', async ({ page }) => {
  const unavailable: ImpactResponse = { ...impact, mode: 'unavailable', decision: null, facts: { ...impact.facts, partial: true, warnings: ['Only the first 40 files are included.'] }, error: { code: 'JEV_UNAVAILABLE', message: 'Jev is temporarily unavailable.' } }
  await page.route('**/api/change-impact', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(unavailable) }))
  await enterWorkspace(page)
  await page.getByRole('button', { name: 'Analyze change impact' }).click()
  await expect(page.getByText('JEV UNAVAILABLE · DETERMINISTIC EVIDENCE ONLY')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Jev is temporarily unavailable')
  await expect(page.getByText(/Uncertain or incomplete assessment/)).toBeVisible()
  await page.getByText('Deterministic evidence (1 of 1 changed files)').click()
  await expect(page.getByText('Partial analysis: the evidence does not cover the complete change.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Architecture graph' })).toBeVisible()
})

test('live mode requires consent and operator token, sends neither in request body', async ({ page }) => {
  let request: unknown
  let authorization: string | undefined
  await page.route('**/api/change-impact', async (route) => {
    request = route.request().postDataJSON()
    authorization = route.request().headers().authorization
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...impact, mode: 'live', decision: { ...decision, model: 'jev-1.14.0' } }) })
  })
  await enterWorkspace(page)
  await page.getByLabel('Use live Jev (requires operator access)').check()
  await expect(page.getByRole('button', { name: 'Analyze change impact' })).toBeDisabled()
  await page.getByLabel('Operator access token', { exact: true }).fill('test-operator-token')
  await expect(page.getByRole('button', { name: 'Analyze change impact' })).toBeDisabled()
  await page.getByLabel(/I consent to sending this public repository/).check()
  await page.getByRole('button', { name: 'Analyze change impact' }).click()
  await expect(page.getByText('LIVE JEV · TYPESAFE AI')).toBeVisible()
  expect(authorization).toBe('Bearer test-operator-token')
  expect(request).toEqual({ repository: 'sample/project', baseRef: 'main', headRef: HEAD, mode: 'live', consent: true })
})

test('empty comparisons and evidence remain readable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/change-impact', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...impact, facts: { ...impact.facts, files: [], totalChangedFiles: 0 } }) }))
  await enterWorkspace(page)
  await page.getByRole('button', { name: 'Analyze change impact' }).click()
  await expect(page.getByText(/No changed files in this comparison/)).toBeVisible()
  const bounds = await page.locator('.impact-panel').boundingBox()
  expect(bounds).not.toBeNull()
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390)
  await page.locator('.impact-panel').screenshot({ path: test.info().outputPath('change-impact-phone.png') })
  await page.getByLabel('Base branch or commit').fill('feature')
  await expect(page.getByText('DEMO · SIMULATED DECISIONS · NOT LIVE JEV')).toHaveCount(0)
})
