import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/auth/SessionContext'
import { getTelegramCallback } from '@/auth/telegramCallback'
import { usePreferences } from '@/preferences/PreferencesContext'
import { Brand } from '@/components/Brand'
import { TelegramSignIn } from '@/components/TelegramSignIn'
import { PreferencesControls } from '@/components/PreferencesControls'

export function LoginPage() {
  const { session } = useSession()
  const { t } = usePreferences()
  const navigate = useNavigate()
  const location = useLocation()
  const [awaitingCallback, setAwaitingCallback] = useState(() => {
    const callback = getTelegramCallback()
    return Boolean(callback.data || callback.error)
  })
  const finishSignIn = useCallback(() => setAwaitingCallback(false), [])
  useEffect(() => {
    if (session && !awaitingCallback) {
      const from = location.state?.from
      const path = typeof from?.pathname === 'string' && /^\/(book|my|admin|beta)(\/|$)/.test(from.pathname) ? from.pathname : '/book'
      navigate(path, { replace: true })
    }
  }, [session, awaitingCallback, navigate, location.state])

  return (
    <main className="login-layout">
      <section className="login-poster">
        <img src={`${import.meta.env.BASE_URL}club-logo.jpg`} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="login-poster-shade" />
        <div className="relative z-10"><Brand inverse /></div>
        <div className="relative z-10">
          <h2 className="login-poster-title">{t('Warhammer and tabletop games')}</h2>
        </div>
      </section>
      <section className="login-content" aria-labelledby="login-title">
        <header className="login-header">
          <div className="login-mobile-brand"><Brand /></div>
          <div className="login-preferences"><PreferencesControls /></div>
        </header>
        <div className="login-form-area">
          <div className="login-form">
            <h1 id="login-title" className="login-title">{t('Reserve your table')}</h1>
            <p className="login-intro">{t('Sign in with Telegram to choose a table and time.')}</p>
            <div className="login-sign-in"><TelegramSignIn onSuccess={finishSignIn} /></div>
            {session && awaitingCallback && <button type="button" onClick={finishSignIn} className="mt-3 min-h-11 text-sm text-dim underline underline-offset-4 hover:text-text">{t('Keep my current account')}</button>}
          </div>
        </div>
        <footer className="login-hours">{t('Club hours: 10:00 to 22:00')}</footer>
      </section>
    </main>
  )
}
