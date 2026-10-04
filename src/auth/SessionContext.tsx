import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, HttpError, setOnUnauthorized } from '@/api/client'
import { clearSession, getSession, saveSession, SESSION_KEY, type StoredSession } from './session'
import type { MeResponse, TelegramAuthData, TokenResponse } from '@/api/types'

interface SessionContextValue {
  session: StoredSession | null
  login: (data: TelegramAuthData) => Promise<void>
  loginWithToken: (rawToken: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => getSession())
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const authAttempt = useRef(0)

  const endSession = useCallback(() => {
    authAttempt.current += 1
    clearSession()
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => setOnUnauthorized(endSession), [endSession])

  useEffect(() => {
    const sync = () => {
      const current = getSession()
      if (current?.token !== session?.token) {
        authAttempt.current += 1
        queryClient.clear()
        setSession(current)
      }
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) sync()
    }
    window.addEventListener('storage', storageChanged)
    window.addEventListener('focus', sync)
    const timer = session ? window.setInterval(sync, Math.min(Math.max(session.expires_at - Date.now(), 1000), 60000)) : undefined
    return () => {
      window.removeEventListener('storage', storageChanged)
      window.removeEventListener('focus', sync)
      window.clearInterval(timer)
    }
  }, [session, queryClient])

  const login = useCallback(async (data: TelegramAuthData) => {
    const attempt = ++authAttempt.current
    let token: TokenResponse
    try {
      token = await api.post<TokenResponse>('/api/v1/auth/telegram', data, false)
    } catch (error) {
      if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
        throw new Error('Telegram could not confirm this sign-in. Please try again.')
      }
      throw error
    }
    if (attempt !== authAttempt.current) return
    const next = saveSession(token)
    queryClient.clear()
    setSession(next)
  }, [queryClient])

  const loginWithToken = useCallback(async (rawToken: string) => {
    const attempt = ++authAttempt.current
    const token = rawToken.trim().replace(/^Bearer\s+/i, '')
    if (!token) throw new Error('Enter an access token.')
    const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error('This access token is invalid or expired.')
    const me: MeResponse = await response.json()
    if (attempt !== authAttempt.current) return
    const next = saveSession({ access_token: token, ...me })
    queryClient.clear()
    setSession(next)
  }, [queryClient])

  const logout = useCallback(() => {
    endSession()
    navigate('/login', { replace: true })
  }, [endSession, navigate])

  const value = useMemo(() => ({ session, login, loginWithToken, logout, isAdmin: session?.is_admin ?? false }),
    [session, login, loginWithToken, logout])

  return (
    <SessionContext.Provider value={value}>
      <React.Fragment key={session?.token ?? 'signed-out'}>{children}</React.Fragment>
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside SessionProvider')
  return context
}
