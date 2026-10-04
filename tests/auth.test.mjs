import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Use the project's compiler so the same tests run on the Node 20 CI runtime.
async function loadTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { readTelegramCallback, captureTelegramCallback, getTelegramCallback, clearTelegramCallback } = await loadTypeScript('../src/auth/telegramCallback.ts')
const { clearSession, getSession, saveSession, SESSION_KEY, tokenExpiresAt } = await loadTypeScript('../src/auth/session.ts')

const now = 1_800_000_000_000
const valid = { id: '123456', first_name: 'Alex', auth_date: String(now / 1000), hash: 'a'.repeat(64) }
const query = (extra = {}) => new URLSearchParams({ ...valid, ...extra }).toString()
const base = 'https://club.example/iron-crusader-booking/'
const jwt = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`
const account = { access_token: 'opaque-server-token', user_id: 123456, user_name: 'Alex', is_admin: false }
let storage

beforeEach(() => {
  storage = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
  })
  clearSession()
  clearTelegramCallback()
})

test('login_url callback preserves signed fields, strips credentials and keeps application URL', () => {
  const result = readTelegramCallback(`${base}?theme=light&${query({ first_name: 'Алекс & Co', username: 'alex', photo_url: 'https://images.example/alex.jpg' })}#/login`, now)
  assert.equal(result.error, null)
  assert.deepEqual(result.data, { id: 123456, first_name: 'Алекс & Co', username: 'alex', photo_url: 'https://images.example/alex.jpg', auth_date: now / 1000, hash: valid.hash })
  assert.equal(result.cleanUrl, `${base}?theme=light#/login`)
})

test('supports callback parameters inside HashRouter URLs', () => {
  const result = readTelegramCallback(`${base}#/login?from=book&${query()}`, now)
  assert.equal(result.data.id, 123456)
  assert.equal(result.cleanUrl, `${base}#/login?from=book`)
})

test('refuses duplicated fields and mixed callback locations', () => {
  assert.equal(readTelegramCallback(`${base}?${query()}&id=999#/login`, now).data, null)
  assert.equal(readTelegramCallback(`${base}?${query()}#/login?${query()}`, now).data, null)
})

test('rejects stale, future, incomplete and unsafe numeric callback data', () => {
  for (const fields of [
    { auth_date: String(now / 1000 - 601) },
    { auth_date: String(now / 1000 + 61) },
    { hash: '' },
    { id: '9007199254740993' },
    { id: '123.5' },
    { first_name: '' },
  ]) {
    const result = readTelegramCallback(`${base}?${query(fields)}`, now)
    assert.equal(result.data, null)
    assert.ok(result.error)
    assert.equal(result.cleanUrl, base)
  }
})

test('ordinary URLs and declined Telegram consent are not treated as authenticated', () => {
  const url = `${base}?campaign=club#/login`
  assert.deepEqual(readTelegramCallback(url, now), { data: null, error: null, cleanUrl: url })
})

test('startup strips credentials before rendering and enters the login route', () => {
  const url = `${base}?${query({ auth_date: String(Math.floor(Date.now() / 1000)) })}#/book`
  const previousWindow = globalThis.window
  let replaced
  globalThis.window = {
    location: { href: url },
    history: { state: { idx: 0 }, replaceState: (state, title, href) => { replaced = { state, title, href } } },
  }
  try {
    captureTelegramCallback()
    assert.equal(replaced.href, `${base}#/login`)
    assert.deepEqual(replaced.state, { idx: 0 })
    assert.equal(getTelegramCallback().data.id, 123456)
    clearTelegramCallback()
    assert.equal(getTelegramCallback().data, null)
  } finally {
    globalThis.window = previousWindow
  }
})

test('session respects token expiration and does not invent another 30 days', () => {
  const expiresAt = Math.floor(Date.now() / 1000) + 900
  const session = saveSession({ ...account, access_token: jwt(expiresAt) })
  assert.equal(session.expires_at, expiresAt * 1000)
  assert.equal(getSession().user_id, account.user_id)
  assert.equal(tokenExpiresAt('opaque-server-token'), null)
})

test('backend expires_in is respected when earlier than token expiry', () => {
  const started = Date.now()
  const session = saveSession({ ...account, access_token: jwt(started / 1000 + 900), expires_in: 30 })
  assert.ok(session.expires_at >= started + 30_000)
  assert.ok(session.expires_at <= Date.now() + 30_000)
})

test('expired responses are never saved and older stored JWT sessions expire correctly', () => {
  const access_token = jwt(Math.floor(Date.now() / 1000) - 10)
  assert.throws(() => saveSession({ ...account, access_token }), /expired/)
  storage.set(SESSION_KEY, JSON.stringify({ token: access_token, user_id: 123456, user_name: 'Alex', is_admin: false, expires_at: Date.now() + 90_000 }))
  assert.equal(getSession(), null)
  assert.equal(storage.has(SESSION_KEY), false)
})

test('corrupt and malformed persisted sessions are discarded instead of restored', () => {
  saveSession(account)
  storage.set(SESSION_KEY, '{invalid')
  assert.equal(getSession(), null)
  storage.set(SESSION_KEY, JSON.stringify({ ...account, expires_at: Date.now() + 60_000 }))
  assert.equal(getSession(), null)
})

test('blocked browser storage still allows a session in the current tab and a clean logout', () => {
  localStorage.setItem = () => { throw new Error('Storage blocked') }
  saveSession(account)
  assert.equal(getSession().user_id, account.user_id)
  clearSession()
  assert.equal(getSession(), null)
})

test('removing a persisted session in another tab invalidates the local cache', () => {
  saveSession(account)
  storage.delete(SESSION_KEY)
  assert.equal(getSession(), null)
})

test('logout cannot restore a saved token when the browser refuses its removal', () => {
  saveSession(account)
  localStorage.removeItem = () => { throw new Error('Storage blocked') }
  clearSession()
  assert.equal(getSession(), null)
})
