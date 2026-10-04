export const LANGUAGES = ['en', 'ru', 'ro', 'uk'] as const
export type Language = typeof LANGUAGES[number]
export type Theme = 'dark' | 'light'
export const LANGUAGE_KEY = 'ic.language.v1'
export const THEME_KEY = 'ic.theme.v1'
export const LOCALES: Record<Language, string> = { en: 'en-GB', ru: 'ru-RU', ro: 'ro-RO', uk: 'uk-UA' }

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

export function detectLanguage(preferred: readonly string[]): Language {
  for (const value of preferred) {
    const base = value.toLowerCase().split(/[-_]/)[0]
    if (isLanguage(base)) return base
  }
  return 'en'
}

export function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch { /* Preferences still work for the current tab without storage. */ }
  return detectLanguage(typeof navigator === 'undefined' ? ['en'] : navigator.languages?.length ? navigator.languages : [navigator.language])
}

export function readTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

export function interpolate(message: string, values: Record<string, string | number> = {}): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) => Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match)
}
