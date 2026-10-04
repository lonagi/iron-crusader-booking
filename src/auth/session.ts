import type { TokenResponse } from '../api/types'

export const SESSION_KEY = 'ic.session.v1'
const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000
let memorySession: StoredSession | null = null
let memoryOnly = false

export interface StoredSession {
  token: string
  user_id: number
  user_name: string
  is_admin: boolean
  expires_at: number
}

// Only expiry is read here. Identity and permissions always come from the API.
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded: unknown = JSON.parse(atob(normalized))
    if (typeof decoded !== 'object' || decoded === null || !('exp' in decoded)) return null
    const exp = decoded.exp
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
  } catch {
    return null
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Partial<StoredSession>
  return typeof session.token === 'string' && session.token.length > 0 &&
    typeof session.user_id === 'number' && Number.isSafeInteger(session.user_id) && session.user_id > 0 &&
    typeof session.user_name === 'string' && typeof session.is_admin === 'boolean' &&
    typeof session.expires_at === 'number' && Number.isFinite(session.expires_at)
}

export function getSession(): StoredSession | null {
  let candidate: unknown = memorySession
  if (!memoryOnly) {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      try {
        candidate = raw ? JSON.parse(raw) : null
      } catch {
        candidate = null
      }
    } catch {
      // Keep this tab usable when the browser blocks persistent storage.
    }
  }
  if (!isStoredSession(candidate)) {
    clearSession()
    return null
  }
  const jwtExpiry = tokenExpiresAt(candidate.token)
  const expiresAt = Math.min(candidate.expires_at, jwtExpiry ?? Infinity)
  if (Date.now() >= expiresAt) {
    clearSession()
    return null
  }
  memorySession = { ...candidate, expires_at: expiresAt }
  return memorySession
}

export function saveSession(data: Pick<TokenResponse, 'access_token' | 'user_id' | 'user_name' | 'is_admin' | 'expires_in'>): StoredSession {
  const now = Date.now()
  const explicitExpiry = typeof data.expires_in === 'number' && Number.isFinite(data.expires_in)
    ? now + data.expires_in * 1000 : Infinity
  const session: StoredSession = {
    token: data.access_token,
    user_id: data.user_id,
    user_name: data.user_name,
    is_admin: data.is_admin,
    expires_at: Math.min(now + MAX_SESSION_AGE, explicitExpiry, tokenExpiresAt(data.access_token) ?? Infinity),
  }
  if (!isStoredSession(session) || session.expires_at <= now) {
    throw new Error('Your sign-in has expired. Please try again.')
  }
  memorySession = session
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    memoryOnly = false
  } catch {
    // A private browser can still retain the session until the page closes.
    memoryOnly = true
  }
  return session
}

export function clearSession() {
  memorySession = null
  memoryOnly = false
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage can be unavailable in private browsers.
    memoryOnly = true
  }
}
