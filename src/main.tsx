import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { captureTelegramCallback } from '@/auth/telegramCallback'
import { PreferencesProvider } from '@/preferences/PreferencesContext'
import { readTheme } from '@/preferences/settings'
import App from './App'
import './index.css'

captureTelegramCallback()
document.documentElement.dataset.theme = readTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
      <HashRouter>
        <App />
      </HashRouter>
      </PreferencesProvider>
    </QueryClientProvider>
    </MotionConfig>
  </React.StrictMode>,
)
