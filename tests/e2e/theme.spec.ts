import { expect, test } from '@playwright/test'

const COMMIT = 'a'.repeat(40)
const analysis = {
  repository: { owner: 'sindresorhus', name: 'is', url: 'https://github.com/sindresorhus/is' },
  requestedBranch: 'main', commitSha: COMMIT, commitUrl: `https://github.com/sindresorhus/is/commit/${COMMIT}`,
  analyzedAt: '2026-10-28T08:00:00.000Z', analyzerVersion: '0.1.0', partial: false, warnings: [],
  counts: { discoveredFiles: 1, analyzedFiles: 1, skippedFiles: 0, sourceBytes: 20, modules: 1, internalDependencies: 0, externalDependencies: 0, unresolvedDependencies: 0 },
  languages: [{ name: 'TypeScript', files: 1 }], frameworks: [], packageManagers: ['npm'],
  files: [{ path: 'src/index.ts', blobSha: 'b'.repeat(40), size: 20, language: 'TypeScript', analyzed: true }],
  nodes: [
    { id: 'project:root', type: 'project', label: 'is' },
    { id: 'module:src', type: 'module', label: 'src', path: 'src', fileCount: 1 },
    { id: 'file:src/index.ts', type: 'file', label: 'index.ts', path: 'src/index.ts' },
  ],
  edges: [
    { id: 'contains:project->src', source: 'project:root', target: 'module:src', type: 'contains', evidence: [] },
    { id: 'contains:src->index', source: 'module:src', target: 'file:src/index.ts', type: 'contains', evidence: [] },
  ],
}

for (const scheme of ['light', 'dark'] as const) {
  test(`first visit respects the browser's ${scheme} color preference`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
    await expect(page.locator('html')).toHaveCSS('color-scheme', scheme)
    await expect(page.getByRole('button', { name: `Switch to ${scheme === 'light' ? 'dark' : 'light'} mode` })).toBeVisible()
  })
}

test('keyboard theme choice persists through reload and overrides system changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Switch to light mode' })
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeFocused()
  expect(await page.evaluate(() => localStorage.getItem('archeo-theme'))).toBe('light')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('saved preference is applied before the application bundle loads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => localStorage.setItem('archeo-theme', 'dark'))
  await page.route('**/*.js', route => route.abort())
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
})

test('theme follows mobile navigation and changing it preserves the analysis', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 320, height: 800 })
  await page.route('**/api/analyze', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analysis) }))
  await page.goto('/')
  const landingToggle = page.getByRole('button', { name: 'Switch to dark mode' })
  await expect(landingToggle).toBeInViewport()
  await landingToggle.click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: /sindresorhus\/is/i }).click()
  await expect(page.getByText('ARCHITECTURE MAP', { exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const workspaceToggle = page.getByRole('button', { name: 'Switch to light mode' })
  await expect(workspaceToggle).toBeInViewport()
  const darkCanvas = await page.locator('.graph-canvas').evaluate(element => getComputedStyle(element).backgroundColor)
  await workspaceToggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('link', { name: 'sindresorhus / is' })).toBeVisible()
  await expect(page.getByRole('treeitem', { name: 'src/index.ts', exact: true })).toBeVisible()
  expect(await page.locator('.graph-canvas').evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(darkCanvas)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Clear analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Understand any codebase.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible()
})

test('theme remains usable when browser storage is blocked', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('Storage is blocked', 'SecurityError') },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible()
  expect(errors).toEqual([])
})
