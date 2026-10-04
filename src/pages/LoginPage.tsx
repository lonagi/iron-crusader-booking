import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Clock3 } from 'lucide-react'
import { useSession } from '@/auth/SessionContext'
import { getTelegramCallback } from '@/auth/telegramCallback'
import { Brand } from '@/components/Brand'
import { TelegramSignIn } from '@/components/TelegramSignIn'

function TableIllustration() {
  return (
    <svg viewBox="0 0 520 330" fill="none" className="w-full" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
        <path d="m47 136 238-100 191 127-238 119L47 136Z" fill="#c5d0a8" fillOpacity=".05" />
        <path d="M47 136v16l191 148 238-120v-17M238 282v18M69 169v37l15 11v-36m364 13v37l-15 8v-37M223 289v27l15 11v-27" />
        <path d="m80 133 204-85 156 111-202 103L80 133Z" strokeOpacity=".3" strokeDasharray="3 5" />
        <path d="m110 133 41-18 41 29-42 20-40-31Z" fill="#c5d0a8" fillOpacity=".14" />
        <path d="M110 133v-39l15-6v20l26-11v18m0-18 41 28v19M110 94l41 28v22m-27-31 41 29" />
        <path d="m274 110 45-20 48 31-45 22-48-33Z" fill="#c5d0a8" fillOpacity=".14" />
        <path d="M274 110V74l16-7v21l29-13v15m0-15 48 30v16m-45 22v-19l45-19" />
        <path d="m219 208 37-18 41 29-39 20-39-31Z" fill="#c5d0a8" fillOpacity=".14" />
        <path d="M219 208v-38l13-6v23l24-12v15m0-15 41 29v15m-39 20v-19l39-16" />
        <ellipse cx="231" cy="136" rx="13" ry="7" /><path d="M226 135v-14l5-5 5 5v14m-5-19v-7m-11 17 6-5m10 0 6 5" />
        <ellipse cx="330" cy="182" rx="13" ry="7" /><path d="M325 181v-14l5-5 5 5v14m-5-19v-7m-11 17 6-5m10 0 6 5" />
        <ellipse cx="171" cy="193" rx="13" ry="7" /><path d="M166 192v-14l5-5 5 5v14m-5-19v-7m-11 17 6-5m10 0 6 5" />
        <path d="m220 76-83 35m270 85-89 43" strokeOpacity=".4" strokeDasharray="3 5" />
        <path d="m416 80 25-9 20 14-25 10-20-15Z M416 80v21l20 15 25-11V85m-25 10v21" />
        <circle cx="437" cy="81" r="1.4" fill="currentColor" /><path d="m424 94 4 3m17 4 4-2" strokeWidth="2.5" />
      </g>
    </svg>
  )
}

export function LoginPage() {
  const { session } = useSession()
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
      const path = typeof from?.pathname === 'string' && /^\/(book|my|admin)(\/|$)/.test(from.pathname) ? from.pathname : '/book'
      navigate(path, { replace: true })
    }
  }, [session, awaitingCallback, navigate, location.state])

  return (
    <main className="grid min-h-screen bg-bg lg:grid-cols-[1.05fr_1fr]">
      <section className="login-poster flex flex-col justify-between px-8 py-9 sm:px-14 sm:py-12 lg:min-h-screen lg:px-16">
        <Brand inverse />
        <div className="relative z-10 mt-8 lg:my-9">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.22em] text-[#c5d0a8]">Table bookings</p>
          <h1 className="font-display text-[42px] font-medium uppercase leading-[1.06] tracking-[-.025em] sm:text-[60px] xl:text-[72px]">Bring your army.<br /><span className="text-[#c5d0a8]">We'll keep<br className="hidden lg:block" /> a table.</span></h1>
          <div className="mx-auto mt-5 hidden max-w-[410px] text-[#c5d0a8] lg:block"><TableIllustration /></div>
        </div>
        <div className="relative z-10 mt-8 flex items-center justify-between border-t border-[#f5f3ed30] pt-5 text-xs text-[#d7dfcf]">
          <span>Club hours</span><span>10:00 to 22:00</span>
        </div>
      </section>
      <section className="flex flex-col justify-between px-7 py-10 sm:px-14 sm:py-12 lg:px-16">
        <p className="section-kicker hidden text-right lg:block">Club reservations <ArrowUpRight className="ml-2 inline h-3.5 w-3.5" /></p>
        <div className="mx-auto w-full max-w-[370px] py-5 lg:py-16">
          <p className="section-kicker mb-4">Your next game</p>
          <h2 className="font-display text-[44px] font-medium uppercase leading-tight tracking-tight sm:text-[52px]">Book a table.</h2>
          <p className="mt-4 text-sm leading-7 text-dim">Sign in with Telegram, choose a table and pick a time. Your bookings will be saved here.</p>
          <div className="mt-9"><TelegramSignIn onSuccess={finishSignIn} /></div>
          {session && awaitingCallback && <button type="button" onClick={finishSignIn} className="mt-4 w-full py-1 text-sm text-muted underline underline-offset-4 hover:text-text">Keep my current account</button>}
          <div className="mt-9 flex items-start gap-3 border-t border-border pt-6">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-xs leading-6 text-muted">Club hours 10:00 to 22:00.<br />Book up to 30 days ahead.</p>
          </div>
        </div>
        <p className="mx-auto mt-6 w-full max-w-[370px] text-[11px] leading-5 text-muted">Iron Crusader Warhammer Club</p>
      </section>
    </main>
  )
}
