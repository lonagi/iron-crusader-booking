import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Bookmark, Settings, LogOut, Clock3 } from 'lucide-react'
import { useSession } from '@/auth/SessionContext'
import { Brand } from './Brand'
import { cn } from '@/lib/cn'

export function Layout() {
  const { session, logout, isAdmin } = useSession()
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <a href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }} className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-4">Skip to content</a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-5 px-5 pt-5 sm:px-8 lg:py-5">
          <Brand />
          <nav aria-label="Main navigation" className="order-3 flex w-full gap-1 pt-4 pb-3 lg:order-none lg:w-auto lg:p-0">
            {[
              { to: '/book', Icon: CalendarDays, label: 'Book a table' },
              { to: '/my', Icon: Bookmark, label: 'My bookings' },
              ...(isAdmin ? [{ to: '/admin', Icon: Settings, label: 'Manage club' }] : []),
            ].map(({ to, Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn('nav-item flex-1 px-2 text-xs sm:flex-none sm:px-3.5 sm:text-[13px]', isActive && 'active')}>
                <Icon className="h-4 w-4 shrink-0" /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-36 truncate text-xs font-semibold text-dim sm:block">{session?.user_name}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-xs font-bold text-gold" aria-hidden="true">
              {session?.user_name?.trim().slice(0, 2).toUpperCase()}
            </div>
            <button onClick={logout} aria-label="Sign out" title="Sign out" className="btn-icon border-transparent"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8 outline-none sm:px-8 sm:py-12"><Outlet /></main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-[11px] text-muted sm:px-8">
          <span className="font-semibold tracking-wide">IRON CRUSADER <span className="ml-2 font-normal tracking-normal">Warhammer Club</span></span>
          <span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />Club hours 10:00 to 22:00</span>
        </div>
      </footer>
    </div>
  )
}
