import type { TelegramAuthData } from '../api/types'

const AUTH_FIELDS = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash'] as const
const MAX_CALLBACK_AGE_SECONDS = 10 * 60

export interface TelegramCallback {
  data: TelegramAuthData | null
  error: string | null
  cleanUrl: string
}

let capturedCallback: TelegramCallback | null = null

// Call before React renders or third-party login scripts are inserted.
export function captureTelegramCallback() {
  const callback = readTelegramCallback(window.location.href)
  if (!callback.data && !callback.error) return
  const cleanUrl = new URL(callback.cleanUrl)
  cleanUrl.hash = '/login'
  window.history.replaceState(window.history.state, '', cleanUrl.href)
  capturedCallback = { ...callback, cleanUrl: cleanUrl.href }
}

export function getTelegramCallback(): TelegramCallback {
  return capturedCallback ?? { data: null, error: null, cleanUrl: window.location.href }
}

export function clearTelegramCallback() {
  capturedCallback = null
}

// Shape validation only. The API must verify Telegram's signature.
export function readTelegramCallback(href: string, now = Date.now()): TelegramCallback {
  const url = new URL(href)
  const hashQueryIndex = url.hash.indexOf('?')
  const hashPath = hashQueryIndex >= 0 ? url.hash.slice(0, hashQueryIndex) : url.hash
  const hashParams = new URLSearchParams(hashQueryIndex >= 0 ? url.hash.slice(hashQueryIndex + 1) : '')
  const queryHasAuth = url.searchParams.has('hash') || url.searchParams.has('auth_date')
  const hashHasAuth = hashParams.has('hash') || hashParams.has('auth_date')
  const params = queryHasAuth ? new URLSearchParams(url.searchParams) : new URLSearchParams(hashParams)
  if (!queryHasAuth && !hashHasAuth) return { data: null, error: null, cleanUrl: url.href }

  for (const field of AUTH_FIELDS) {
    url.searchParams.delete(field)
    hashParams.delete(field)
  }
  if (hashQueryIndex >= 0) url.hash = hashPath + (hashParams.size ? `?${hashParams}` : '')
  const invalid = (error: string): TelegramCallback => ({ data: null, error, cleanUrl: url.href })
  if ((queryHasAuth && hashHasAuth) || AUTH_FIELDS.some(field => params.getAll(field).length > 1)) {
    return invalid('This sign-in link is invalid. Please open a new one from Telegram.')
  }

  const rawId = params.get('id') || ''
  const rawAuthDate = params.get('auth_date') || ''
  const id = Number(rawId)
  const authDate = Number(rawAuthDate)
  const firstName = params.get('first_name')
  const hash = params.get('hash') || ''
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0 ||
      !/^\d+$/.test(rawAuthDate) || !Number.isSafeInteger(authDate) ||
      !firstName?.trim() || firstName.length > 256 || !/^[a-f\d]{64}$/i.test(hash)) {
    return invalid('This sign-in link is incomplete. Please open a new one from Telegram.')
  }
  const age = Math.floor(now / 1000) - authDate
  if (age > MAX_CALLBACK_AGE_SECONDS || age < -60) {
    return invalid('This sign-in link has expired. Please open a new one from Telegram.')
  }
  const data: TelegramAuthData = { id, first_name: firstName, auth_date: authDate, hash }
  for (const field of ['last_name', 'username', 'photo_url'] as const) {
    const value = params.get(field)
    if (value !== null) data[field] = value
  }
  return { data, error: null, cleanUrl: url.href }
}
