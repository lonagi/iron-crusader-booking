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
    script.setAttribute('data-radius', '10')
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
      <div className={status === 'error' ? 'hidden' : 'relative flex min-h-12 items-center'}>
        <div ref={container} className={busy || status !== 'ready' ? 'pointer-events-none invisible' : ''} aria-busy={status === 'loading' || busy} />
        {(status === 'loading' || busy) && (
          <span className="absolute inset-0 flex items-center gap-2 text-base text-dim" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t(busy ? 'Signing in' : 'Connecting to Telegram')}
          </span>
        )}
      </div>
      {status === 'error' && (
        <div className="space-y-3">
          <button type="button" className="btn btn-primary min-h-12 w-full" onClick={() => setAttempt(value => value + 1)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('Try again')}
          </button>
          <p className="text-sm leading-6 text-dim" role="alert">{t('Telegram did not load. Check your connection and try again.')}</p>
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
    return (
      <div className="space-y-3">
        <button type="button" disabled className="btn btn-primary min-h-12 w-full" aria-describedby="login-unavailable">
          <Send className="h-4 w-4" aria-hidden="true" />
          {t('Sign in with Telegram')}
        </button>
        <p id="login-unavailable" className="text-sm leading-6 text-dim" role="status">{t('Sign-in is temporarily unavailable. Please try again later.')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingAccount ? (
        <div className="space-y-3">
          <button type="button" disabled={busy} className="btn btn-primary min-h-12 w-full justify-center" onClick={() => void signIn(pendingAccount)}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {busy ? t('Signing in') : t('Continue as {name}', { name: pendingAccount.first_name })}
          </button>
          {VALID_BOT && <button type="button" disabled={busy} className="min-h-11 text-sm text-dim underline underline-offset-4 hover:text-text" onClick={() => { setPendingAccount(null); setError(null) }}>{t('Use another account')}</button>}
        </div>
      ) : (
        <>
          {APP_LOGIN_ENABLED && !showBrowser && (
            <div className="space-y-3">
              <a href={`https://t.me/${BOT_USERNAME}?start=booking`} target="_blank" rel="noopener noreferrer" className="btn btn-primary min-h-12 w-full justify-center">
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('Open Telegram')}
                <ArrowUpRight className="ml-auto h-4 w-4" aria-hidden="true" />
              </a>
              <p className="text-sm leading-6 text-dim">{t('Open the club bot, then tap Sign in.')}</p>
              <button type="button" className="min-h-11 text-sm text-dim underline underline-offset-4 hover:text-text" onClick={() => setShowBrowser(true)}>{t('Use this browser instead')}</button>
            </div>
          )}
          {showBrowser && <BrowserLogin onAuth={signIn} busy={busy} />}
          {showBrowser && APP_LOGIN_ENABLED && <button type="button" className="min-h-11 text-sm text-dim underline underline-offset-4 hover:text-text" onClick={() => setShowBrowser(false)}>{t('Open Telegram')}</button>}
        </>
      )}
      {error && <p role="alert" className="text-sm leading-6 text-red">{t(error)}</p>}
    </div>
  )
}
