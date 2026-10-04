import type { ApiError } from './types'
import { clearSession, getSession } from '../auth/session'

export { clearSession, getSession, saveSession, type StoredSession } from '../auth/session'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export class HttpError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

function getErrorMessage(status: number, detail: unknown): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.'
    case 403:
      return 'You do not have permission to do this.'
    case 404:
      return 'We could not find that item.'
    case 409:
      return 'That time has just been booked. Please choose another slot.'
    case 422:
      return typeof detail === 'object' && detail !== null && 'detail' in detail &&
        typeof (detail as ApiError).detail === 'string'
        ? String((detail as ApiError).detail)
        : 'Please check the details and try again.'
    default:
      return 'We could not connect to the club. Please try again shortly.'
  }
}

let onUnauthorized: (() => void) | null = null
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb
  return () => {
    if (onUnauthorized === cb) onUnauthorized = null
  }
}

async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const session = authenticated ? getSession() : null
  if (session) headers.set('Authorization', `Bearer ${session.token}`)

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: options.signal ?? AbortSignal.timeout(20000) })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error('We could not connect to the club. Please check your connection and try again.')
  }
  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    // An old request must not sign out a newer session.
    if (res.status === 401 && authenticated && session?.token === getSession()?.token) {
      clearSession()
      onUnauthorized?.()
    }
    throw new HttpError(res.status, data, getErrorMessage(res.status, data))
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown, authenticated = true) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, authenticated),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
