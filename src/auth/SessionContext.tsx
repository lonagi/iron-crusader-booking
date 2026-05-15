import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession, getSession, saveSession, setOnUnauthorized, type StoredSession } from '@/api/client'
import type { TelegramAuthData, TokenResponse } from '@/api/types'

interface SessionContextValue {
  session: StoredSession | null
  login: (data: TelegramAuthData) => Promise<void>
  loginWithToken: (rawToken: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => getSession())
  const navigate = useNavigate()

  useEffect(() => {
    setOnUnauthorized(() => {
      setSession(null)
      navigate('/login', { replace: true })
    })
  }, [navigate])

  async function login(data: TelegramAuthData) {
    const res = await fetch(`${API_BASE}/api/v1/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.detail || 'Authentication failed')
    }
    const token: TokenResponse = await res.json()
    saveSession(token)
    setSession(getSession())
  }

  async function loginWithToken(rawToken: string) {
    const trimmed = rawToken.trim().replace(/^Bearer\s+/i, '')
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${trimmed}` },
    })
    if (!res.ok) throw new Error('Invalid or expired token')
    const me = await res.json()
    saveSession({
      access_token: trimmed,
      user_id: me.user_id,
      user_name: me.user_name,
      is_admin: me.is_admin,
    })
    setSession(getSession())
  }

  function logout() {
    clearSession()
    setSession(null)
    navigate('/login', { replace: true })
  }

  return (
    <SessionContext.Provider value={{ session, login, loginWithToken, logout, isAdmin: session?.is_admin ?? false }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
