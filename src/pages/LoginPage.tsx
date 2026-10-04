import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Clock3 } from 'lucide-react'
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
    <main className="grid min-h-screen bg-bg lg:grid-cols-[1.05fr_1fr]">
      <section className="login-poster flex flex-col justify-between px-8 py-9 sm:px-14 sm:py-12 lg:min-h-screen lg:px-14 xl:px-16">
        <img src={`${import.meta.env.BASE_URL}club-logo.jpg`} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25 lg:opacity-65" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#170c0a] via-[#170c0a]/60 to-[#170c0a]/25" />
        <div className="relative z-10"><Brand inverse /></div>
        <div className="relative z-10 mt-10 lg:mt-72">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#f0b29f]">{t('Table bookings')}</p>
          <h1 className="max-w-xl font-display text-[38px] font-medium uppercase leading-[1.13] tracking-[-.02em] sm:text-[52px] xl:text-[66px]">{t('Bring your army.')}<br /><span className="text-[#f0b29f]">{t("We'll keep a table.")}</span></h1>
        </div>
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#f5ede130] pt-5 text-xs text-[#e5cdc2]">
          <span>{t('Club hours')}</span><span>{t('10:00 to 22:00')}</span>
        </div>
      </section>
      <section className="flex min-w-0 flex-col justify-between px-6 py-7 sm:px-14 sm:py-10 lg:px-12 xl:px-16">
        <div className="flex justify-end"><PreferencesControls /></div>
        <div className="mx-auto w-full max-w-[390px] py-10 lg:py-16">
          <p className="section-kicker mb-4">{t('Your next game')}</p>
          <h2 className="font-display text-[38px] font-medium uppercase leading-tight tracking-tight sm:text-[46px]">{t('Book a table.')}</h2>
          <p className="mt-4 text-sm leading-7 text-dim">{t('Sign in with Telegram, choose a table and pick a time. Your bookings will be saved here.')}</p>
          <div className="mt-9"><TelegramSignIn onSuccess={finishSignIn} /></div>
          {session && awaitingCallback && <button type="button" onClick={finishSignIn} className="mt-4 w-full py-1 text-sm text-muted underline underline-offset-4 hover:text-text">{t('Keep my current account')}</button>}
          <div className="mt-9 flex items-start gap-3 border-t border-border pt-6">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <div className="text-xs leading-6 text-muted"><p>{t('Club hours')} {t('10:00 to 22:00')}</p><p>{t('Book up to 30 days ahead.')}</p></div>
          </div>
        </div>
        <p className="mx-auto w-full max-w-[390px] text-[11px] leading-5 text-muted">Iron Crusader {t('Warhammer Club')}</p>
      </section>
    </main>
  )
}
