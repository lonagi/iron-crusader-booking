import type { ApiError } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const SESSION_KEY = 'ic.session.v1'

export interface StoredSession {
  token: string
  user_id: number
  user_name: string
  is_admin: boolean
  expires_at: number
}

export function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: StoredSession = JSON.parse(raw)
    if (Date.now() > session.expires_at) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function saveSession(data: { access_token: string; user_id: number; user_name: string; is_admin: boolean }) {
  const session: StoredSession = {
    token: data.access_token,
    user_id: data.user_id,
    user_name: data.user_name,
    is_admin: data.is_admin,
    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

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
      return 'Your session has expired. Please log in again.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return 'This slot is already claimed by another commander!'
    case 422:
      return typeof detail === 'object' && detail !== null && 'detail' in detail
        ? `Validation error: ${JSON.stringify((detail as ApiError).detail)}`
        : 'Invalid request data.'
    default:
      return `Server error (${status}). Try again later.`
  }
}

let onUnauthorized: (() => void) | null = null
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (authenticated) {
    const session = getSession()
    if (session) {
      headers['Authorization'] = `Bearer ${session.token}`
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 204) {
    return undefined as T
  }

  const data = res.ok ? await res.json().catch(() => null) : await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401) {
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
