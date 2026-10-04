import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { commonMessages } from '@/i18n/common'
import { accountMessages } from '@/i18n/account'
import { bookingMessages } from '@/i18n/booking'
import { betaMessages } from '@/i18n/beta'
import { LANGUAGE_KEY, THEME_KEY, LOCALES, readLanguage, readTheme, interpolate, type Language, type Theme } from './settings'

const messages = { ...commonMessages, ...accountMessages, ...bookingMessages, ...betaMessages }
type Variables = Record<string, string | number>

interface Preferences {
  language: Language
  setLanguage: (value: Language) => void
  theme: Theme
  setTheme: (value: Theme) => void
  locale: string
  t: (source: string, values?: Variables) => string
  formatDate: (value: string) => string
  formatShortDate: (value: string) => string
}

const PreferencesContext = createContext<Preferences | null>(null)

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>(readLanguage)
  const [theme, updateTheme] = useState<Theme>(readTheme)
  const locale = LOCALES[language]
  const t = useCallback((source: string, values?: Variables) => interpolate(language === 'en' ? source : messages[source]?.[language] ?? source, values), [language])
  const setLanguage = useCallback((value: Language) => {
    updateLanguage(value)
    try { localStorage.setItem(LANGUAGE_KEY, value) } catch { /* Keep preference in memory. */ }
  }, [])
  const setTheme = useCallback((value: Theme) => {
    updateTheme(value)
    try { localStorage.setItem(THEME_KEY, value) } catch { /* Keep preference in memory. */ }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = `Iron Crusader | ${t('Table bookings')}`
  }, [language, t])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141314' : '#f5f1eb')
  }, [theme])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY || event.key === null) updateLanguage(readLanguage())
      if (event.key === THEME_KEY || event.key === null) updateTheme(readTheme())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const formatDate = useCallback((value: string) => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`)), [locale])
  const formatShortDate = useCallback((value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`)), [locale])
  const context = useMemo(() => ({ language, setLanguage, theme, setTheme, locale, t, formatDate, formatShortDate }), [language, setLanguage, theme, setTheme, locale, t, formatDate, formatShortDate])
  return <PreferencesContext.Provider value={context}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be inside PreferencesProvider')
  return value
}
