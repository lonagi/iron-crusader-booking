import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Key, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useSession } from '@/auth/SessionContext'
import { useToast } from '@/lib/toast'
import type { TelegramAuthData } from '@/api/types'

const BOT_USERNAME = import.meta.env.VITE_TG_BOT_USERNAME || ''
const API_BASE     = import.meta.env.VITE_API_BASE_URL || ''
const SWAGGER_URL  = `${API_BASE}/docs`

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void
    Telegram?: { WebApp?: unknown }
  }
}

// ── Telegram widget ───────────────────────────────────────────────────────────

function TelegramWidget({ botUsername }: { botUsername: string }) {
  const { login } = useSession()
  const navigate  = useNavigate()
  const toast     = useToast()
  const ref       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.onTelegramAuth = async (user: TelegramAuthData) => {
      try {
        await login(user)
        toast('Signed in as ' + user.first_name, 'success')
        navigate('/book', { replace: true })
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Auth failed', 'error')
      }
    }

    if (ref.current && !ref.current.querySelector('script')) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', botUsername)
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-userpic', 'false')
      script.setAttribute('data-radius', '6')
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')
      script.setAttribute('data-request-access', 'write')
      script.async = true
      ref.current.appendChild(script)
    }

    return () => { delete window.onTelegramAuth }
  }, [botUsername, login, navigate, toast])

  return <div ref={ref} className="flex justify-center py-1" />
}

// ── Token fallback ────────────────────────────────────────────────────────────

function TokenFallback() {
  const { loginWithToken } = useSession()
  const navigate = useNavigate()
  const toast    = useToast()
  const [open,    setOpen]    = useState(false)
  const [token,   setToken]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    try {
      await loginWithToken(token.trim())
      toast('Signed in', 'success')
      navigate('/book', { replace: true })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Invalid token', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-muted hover:text-dim transition-colors py-1"
      >
        <Key className="w-3 h-3" />
        Sign in with API token instead
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pt-3 space-y-2">
              {/* Mini help */}
              <div className="card p-3 space-y-2">
                <p className="text-xs text-muted">Get a token from Swagger UI:</p>
                <ol className="space-y-1">
                  {[
                    'POST /api/v1/auth/telegram → Try it out',
                    'Fill in your Telegram user data → Execute',
                    'Copy access_token from response',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted">
                      <span className="shrink-0 w-4 h-4 rounded-full bg-raised border border-border flex items-center justify-center text-[9px] font-medium mt-0.5">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
                <a href={SWAGGER_URL} target="_blank" rel="noreferrer" className="btn btn-secondary w-full justify-center text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Swagger UI
                </a>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                <textarea
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="eyJhbGci…"
                  rows={3}
                  className="input font-mono resize-none"
                  style={{ fontSize: '11px', lineHeight: 1.6 }}
                  spellCheck={false}
                />
                <button type="submit" disabled={!token.trim() || loading} className="btn btn-primary w-full justify-center">
                  {loading ? 'Checking…' : 'Sign in'}
                  {!loading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { session } = useSession()
  const navigate    = useNavigate()

  useEffect(() => {
    if (session) navigate('/book', { replace: true })
  }, [session, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0a0a' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-[360px]"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg"
            style={{ background: '#161616', border: '1px solid #2e2e2e' }}
          >
            ⚔️
          </div>
          <div>
            <div className="font-display text-base font-bold" style={{ color: '#e8c96d', letterSpacing: '0.03em' }}>
              Iron Crusader
            </div>
            <div className="text-xs text-muted mt-0.5">Warhammer Club · Table Booking</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-text tracking-tight mb-1">Sign in</h1>
        <p className="text-sm text-muted mb-6">Continue with Telegram</p>

        {/* Always show Telegram widget */}
        {BOT_USERNAME ? (
          <TelegramWidget botUsername={BOT_USERNAME} />
        ) : (
          <div className="card p-4 text-center">
            <p className="text-sm text-muted">
              Telegram widget not configured.<br />
              Set <code className="text-gold bg-raised px-1 rounded text-xs">VITE_TG_BOT_USERNAME</code> in <code className="text-xs">.env</code>
            </p>
          </div>
        )}

        <p className="text-xs text-subtle mt-8 text-center">Club open 10:00 – 22:00</p>
      </motion.div>
    </div>
  )
}
