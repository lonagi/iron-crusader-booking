import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Bookmark, Settings, LogOut, Clock3, Box } from 'lucide-react'
import { useSession } from '@/auth/SessionContext'
import { usePreferences } from '@/preferences/PreferencesContext'
import { Brand } from './Brand'
import { PreferencesControls } from './PreferencesControls'
import { cn } from '@/lib/cn'

export function Layout() {
  const { session, logout, isAdmin } = useSession()
  const { t } = usePreferences()
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <a href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }} className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-4">{t('Skip to content')}</a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-4">
            <Brand />
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-4">
              <PreferencesControls />
              <span className="hidden max-w-28 truncate text-xs font-semibold text-dim md:block">{session?.user_name}</span>
              <button onClick={logout} aria-label={t('Sign out')} title={t('Sign out')} className="btn-icon border-transparent"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
          <nav aria-label={t('Main navigation')} className="mt-5 flex flex-wrap gap-1 border-t border-border py-2">
            {[
              { to: '/book', Icon: CalendarDays, label: 'Book a table' },
              { to: '/my', Icon: Bookmark, label: 'My bookings' },
              { to: '/beta', Icon: Box, label: '3D Beta' },
              ...(isAdmin ? [{ to: '/admin', Icon: Settings, label: 'Manage club' }] : []),
            ].map(({ to, Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn('nav-item min-w-0 px-2.5 text-xs sm:px-4 sm:text-[13px]', isActive && 'active')}>
                <Icon className="h-4 w-4 shrink-0" /><span>{t(label)}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 outline-none sm:px-8 sm:py-10"><Outlet /></main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[11px] text-muted sm:px-8">
          <span className="font-semibold tracking-wide">IRON CRUSADER <span className="ml-2 font-normal tracking-normal">{t('Warhammer Club')}</span></span>
          <span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />{t('Club hours')} {t('10:00 to 22:00')}</span>
        </div>
      </footer>
    </div>
  )
}
