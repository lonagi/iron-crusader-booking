import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Bookmark, Settings, Box } from 'lucide-react'
import { useSession } from '@/auth/SessionContext'
import { usePreferences } from '@/preferences/PreferencesContext'
import { Brand } from './Brand'
import { AppSettings } from './AppSettings'
import { cn } from '@/lib/cn'

export function Layout() {
  const { isAdmin } = useSession()
  const { t } = usePreferences()
  const links = [
    { to: '/book', Icon: CalendarDays, label: 'Book a table', short: 'Book' },
    { to: '/my', Icon: Bookmark, label: 'My bookings', short: 'My visits' },
    { to: '/beta', Icon: Box, label: 'Room in 3D', short: 'Room in 3D' },
    ...(isAdmin ? [{ to: '/admin', Icon: Settings, label: 'Manage club', short: 'The club' }] : []),
  ]
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <a href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }} className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-4">{t('Skip to content')}</a>
      <header className="border-b border-border/60 bg-surface">
        <div className="mx-auto flex min-h-[88px] max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-8 lg:min-h-[96px]">
          <Brand />
          <nav aria-label={t('Main navigation')} className="hidden items-center gap-1 lg:flex">
            {links.map(({ to, Icon, label }) => <NavLink key={to} to={to} className={({ isActive }) => cn('nav-item', isActive && 'active')}><Icon className="h-[18px] w-[18px] shrink-0" /><span>{t(label)}</span></NavLink>)}
          </nav>
          <AppSettings />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-7 outline-none sm:px-8 sm:py-10 lg:py-12"><Outlet /></main>
      <footer className="mx-auto mb-[calc(84px+env(safe-area-inset-bottom))] flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-7 text-sm text-muted sm:px-8 lg:mb-0">
        <span>Iron Crusader</span><span>{t('Club hours')} {t('10:00 to 22:00')}</span>
      </footer>
      <nav aria-label={t('Main navigation')} className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        {links.map(({ to, Icon, short, label }) => <NavLink key={to} to={to} aria-label={t(label)} className={({ isActive }) => cn('flex min-h-[72px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 py-3 text-center text-xs font-semibold', isActive ? 'text-gold' : 'text-muted')}><Icon className="h-[22px] w-[22px]" /><span>{t(short)}</span></NavLink>)}
      </nav>
    </div>
  )
}
