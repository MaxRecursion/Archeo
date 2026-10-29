import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './ThemeContext'
import { isTheme, type ThemeState } from './initialTheme'


const STORAGE_KEY = 'archeo-theme'
const SYSTEM_QUERY = '(prefers-color-scheme: dark)'

export function ThemeProvider({ initialState, children }: { initialState: ThemeState; children: ReactNode }) {
  const [state, setState] = useState(initialState)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = state.theme
    root.style.colorScheme = state.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'dark' ? '#15151a' : '#FBFAF7')
  }, [state.theme])

  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia(SYSTEM_QUERY) : null
    const followSystem = () => setState((current) => current.preference ? current : { theme: media?.matches ? 'dark' : 'light', preference: null })
    const followStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      const preference = isTheme(event.newValue) ? event.newValue : null
      setState({ theme: preference ?? (media?.matches ? 'dark' : 'light'), preference })
    }
    media?.addEventListener('change', followSystem)
    window.addEventListener('storage', followStorage)
    // Reconcile a preference change that happened between the initial read and subscription.
    followSystem()
    return () => {
      media?.removeEventListener('change', followSystem)
      window.removeEventListener('storage', followStorage)
    }
  }, [])

  const setTheme = useCallback((theme: Theme) => {
    setState({ theme, preference: theme })
    try { window.localStorage.setItem(STORAGE_KEY, theme) } catch { /* Preserve the in-memory choice. */ }
  }, [])
  const toggleTheme = useCallback(() => setTheme(state.theme === 'light' ? 'dark' : 'light'), [setTheme, state.theme])
  const value = useMemo(() => ({ theme: state.theme, toggleTheme }), [state.theme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
