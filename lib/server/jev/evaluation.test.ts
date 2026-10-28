// @vitest-environment node
import { expect, it } from 'vitest'
import { runEvaluation } from './evaluation.js'

it('reproduces the synthetic metadata-only demo evaluation (no live Jev)', () => {
  const report = runEvaluation()
  console.info(JSON.stringify(report, null, 2))
  expect(report.datasetSize).toBe(10)
  expect(report.demo.classificationCorrect).toBe(9)
  expect(report.demo.falseNegatives).toBe(0)
  expect(report.demo.falsePositives).toBe(0)
  expect(report.baseline.classificationCorrect).toBe(3)
})
