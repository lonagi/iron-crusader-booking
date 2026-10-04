import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

async function loadTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { detectLanguage, readLanguage, readTheme, interpolate, LANGUAGE_KEY, THEME_KEY } = await loadTypeScript('../src/preferences/settings.ts')
let storage
beforeEach(() => {
  storage = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => storage.get(key) ?? null } })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['ru-MD', 'en-US'], language: 'ru-MD' } })
})

test('browser language priority and regional tags choose a supported language', () => {
  for (const [preferences, expected] of [
    [['ro-MD', 'ru'], 'ro'], [['uk-UA', 'en-US'], 'uk'], [['ru_RU'], 'ru'], [['en-US', 'ro'], 'en'],
    [['fr-FR', 'de', 'RO-ro'], 'ro'], [['fr'], 'en'], [[], 'en'],
  ]) assert.equal(detectLanguage(preferences), expected)
})

test('saved language overrides browser language and invalid preferences fall back', () => {
  assert.equal(readLanguage(), 'ru')
  storage.set(LANGUAGE_KEY, 'uk')
  assert.equal(readLanguage(), 'uk')
  storage.set(LANGUAGE_KEY, 'invalid')
  assert.equal(readLanguage(), 'ru')
})

test('dark is the first-visit default and explicit light choice persists', () => {
  assert.equal(readTheme(), 'dark')
  storage.set(THEME_KEY, 'light')
  assert.equal(readTheme(), 'light')
  storage.set(THEME_KEY, 'invalid')
  assert.equal(readTheme(), 'dark')
})

test('unavailable storage does not prevent browser language or dark theme', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked') } })
  assert.equal(readLanguage(), 'ru')
  assert.equal(readTheme(), 'dark')
})

test('interpolation handles zero, literal replacement characters and missing values', () => {
  assert.equal(interpolate('{count} {name} {missing}', { count: 0, name: '$& <script>' }), '0 $& <script> {missing}')
})

test('every translation is complete and preserves named values in all four locales', async () => {
  const dictionaries = await Promise.all(['common', 'booking', 'account', 'beta'].map(name => loadTypeScript(`../src/i18n/${name}.ts`)))
  const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  let checked = 0
  for (const module of dictionaries) for (const dictionary of Object.values(module)) {
    for (const [english, translations] of Object.entries(dictionary)) {
      for (const language of ['ru', 'ro', 'uk']) {
        const translated = translations[language]
        assert.equal(typeof translated, 'string', `${english}: missing ${language}`)
        assert.ok(translated.trim(), `${english}: empty ${language}`)
        assert.deepEqual(parameters(translated), parameters(english), `${english}: wrong values in ${language}`)
        assert.doesNotMatch(translated, /[\u2013\u2014\u2022\u00b7\u2026]/, `${english}: unwanted punctuation in ${language}`)
      }
      checked++
    }
  }
  assert.ok(checked > 150, 'All page dictionaries should be included')
})
