import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/features/theme/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const label = theme === 'light' ? 'Dark mode' : 'Light mode'
  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${label.toLowerCase()}`} title={`Switch to ${label.toLowerCase()}`}>
    {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
    <span className="theme-toggle-label">{label}</span>
  </button>
}
