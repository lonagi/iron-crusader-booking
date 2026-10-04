import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUpRight, LoaderCircle, RefreshCw, Send } from 'lucide-react'
import { useSession } from '@/auth/SessionContext'
import { clearTelegramCallback, getTelegramCallback } from '@/auth/telegramCallback'
import type { TelegramAuthData } from '@/api/types'
import { usePreferences } from '@/preferences/PreferencesContext'

const BOT_USERNAME = (import.meta.env.VITE_TG_BOT_USERNAME || '').replace(/^@/, '').trim()
const VALID_BOT = /^[a-zA-Z\d_]{5,32}$/.test(BOT_USERNAME)
// Enable only after the bot implements /start booking and returns a login_url button.
const APP_LOGIN_ENABLED = import.meta.env.VITE_TG_APP_LOGIN_ENABLED === 'true'

function BrowserLogin({ onAuth, busy }: { onAuth: (data: TelegramAuthData) => void; busy: boolean }) {
  const { t, language } = usePreferences()
  const container = useRef<HTMLDivElement>(null)
  const callbackName = `icTelegramAuth_${useId().replace(/[^a-zA-Z\d_]/g, '')}`
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const element = container.current
    if (!element) return
    let active = true
    const callbacks = window as unknown as Record<string, unknown>
    callbacks[callbackName] = onAuth
    setStatus('loading')

    const ready = () => {
      if (active) setStatus('ready')
      window.clearTimeout(timeout)
    }
    const timeout = window.setTimeout(() => {
      if (active) setStatus('error')
    }, 15000)
    const observer = new MutationObserver(() => {
      const iframe = element.querySelector('iframe')
      if (iframe) {
        iframe.title = t('Sign in with Telegram')
        iframe.addEventListener('load', ready, { once: true })
        observer.disconnect()
      }
    })
    observer.observe(element, { childList: true })

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-lang', language)
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    script.onerror = () => {
      if (active) setStatus('error')
      window.clearTimeout(timeout)
    }
    element.appendChild(script)

    return () => {
      active = false
      observer.disconnect()
      window.clearTimeout(timeout)
      delete callbacks[callbackName]
      element.replaceChildren()
    }
  }, [attempt, callbackName, onAuth, language, t])

  return (
    <div className="space-y-3">
      <div className="relative flex min-h-12 items-center justify-center">
        <div ref={container} className={busy || status === 'error' ? 'pointer-events-none opacity-40' : ''} aria-busy={status === 'loading' || busy} />
        {status === 'loading' && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-surface text-sm text-muted" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('Connecting to Telegram')}
          </span>
        )}
      </div>
      {status === 'error' && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted" role="alert">{t('Telegram did not load. Check your connection and try again.')}</p>
          <button type="button" className="btn btn-secondary w-full justify-center" onClick={() => setAttempt(value => value + 1)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('Try again')}
          </button>
        </div>
      )}
    </div>
  )
}

export function TelegramSignIn({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { t } = usePreferences()
  const { login } = useSession()
  const [callback] = useState(getTelegramCallback)
  const [pendingAccount, setPendingAccount] = useState(callback.data)
  const [error, setError] = useState<string | null>(callback.error)
  const [busy, setBusy] = useState(false)
  const [showBrowser, setShowBrowser] = useState(!APP_LOGIN_ENABLED)
  const submitting = useRef(false)
  const mounted = useRef(true)

  useLayoutEffect(() => {
    clearTelegramCallback()
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const signIn = useCallback(async (data: TelegramAuthData) => {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      await login(data)
      if (mounted.current) onSuccess?.()
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'We could not sign you in. Please try again.')
    } finally {
      submitting.current = false
      if (mounted.current) setBusy(false)
    }
  }, [login, onSuccess])

  if (!VALID_BOT && !pendingAccount) {
    return <p className="rounded-lg border border-border bg-raised p-4 text-sm leading-relaxed text-muted">{t('Sign-in is currently unavailable. Please contact the club to book a table.')}</p>
  }

  return (
    <div className="space-y-4">
      {pendingAccount ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('Confirm the account you want to use for bookings.')}</p>
          <button type="button" disabled={busy} className="btn btn-primary min-h-12 w-full justify-center" onClick={() => void signIn(pendingAccount)}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {busy ? t('Signing in') : t('Continue as {name}', { name: pendingAccount.first_name })}
          </button>
          {VALID_BOT && <button type="button" disabled={busy} className="w-full py-1 text-sm text-muted hover:text-text" onClick={() => { setPendingAccount(null); setError(null) }}>{t('Use another account')}</button>}
        </div>
      ) : (
        <>
          {APP_LOGIN_ENABLED && (
            <div className="space-y-3">
              <a href={`https://t.me/${BOT_USERNAME}?start=booking`} target="_blank" rel="noopener noreferrer" className="btn btn-primary min-h-12 w-full justify-center">
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('Open Telegram')}
                <ArrowUpRight className="ml-auto h-4 w-4" aria-hidden="true" />
              </a>
              <p className="text-center text-xs leading-relaxed text-muted">{t('Open the club bot, then tap Sign in.')}</p>
              {!showBrowser && <button type="button" className="w-full py-1 text-sm text-muted underline underline-offset-4 hover:text-text" onClick={() => setShowBrowser(true)}>{t('Use this browser instead')}</button>}
            </div>
          )}
          {showBrowser && <BrowserLogin onAuth={signIn} busy={busy} />}
          {showBrowser && <p className="text-center text-xs leading-relaxed text-muted">{t('Telegram may ask for your number if this browser is not signed in.')}</p>}
          {busy && <p className="flex items-center justify-center gap-2 text-sm text-muted" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{t('Signing in')}</p>}
        </>
      )}
      {error && <p role="alert" className="rounded-lg border border-red/20 bg-red/5 p-3 text-sm leading-relaxed text-red">{t(error)}</p>}
    </div>
  )
}
