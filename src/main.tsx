import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { ThemeProvider } from './features/theme/ThemeProvider'
import { readInitialTheme } from './features/theme/initialTheme'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './styles/globals.css'
import '@xyflow/react/dist/style.css'
import './styles/workspace.css'
import './styles/themes.css'

const initialTheme = readInitialTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ThemeProvider initialState={initialTheme}><App /></ThemeProvider></React.StrictMode>)
