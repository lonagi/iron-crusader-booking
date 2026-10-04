import { Globe2, Moon, Sun } from 'lucide-react'
import { usePreferences } from '@/preferences/PreferencesContext'
import { LANGUAGES, type Language } from '@/preferences/settings'

const names: Record<Language, string> = { en: 'English', ru: 'Русский', ro: 'Română', uk: 'Українська' }

export function PreferencesControls() {
  const { language, setLanguage, theme, setTheme, t } = usePreferences()
  const themeLabel = t(theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')
  return (
    <div className="flex items-center gap-2">
      <label className="relative flex h-[42px] items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-dim">
        <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <select aria-label={t('Language')} value={language} onChange={event => setLanguage(event.target.value as Language)} className="max-w-[105px] cursor-pointer bg-transparent py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-gold">
          {LANGUAGES.map(value => <option key={value} value={value} lang={value}>{names[value]}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn-icon bg-surface" aria-label={themeLabel} title={themeLabel}>
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  )
}
