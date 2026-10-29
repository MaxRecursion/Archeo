import type { Theme } from './ThemeContext'

export interface ThemeState { theme: Theme; preference: Theme | null }

export function isTheme(value: unknown): value is Theme { return value === 'light' || value === 'dark' }

/** Read browser preferences before mounting React, never during component render. */
export function readInitialTheme(): ThemeState {
  let preference: Theme | null = null
  if (typeof window === 'undefined') return { theme: 'light', preference }
  try {
    const saved = window.localStorage.getItem('archeo-theme')
    if (isTheme(saved)) preference = saved
  } catch { /* Browsers may block storage; an in-memory choice still works. */ }
  const systemTheme = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return { theme: preference ?? systemTheme, preference }
}
