import { NavLink, Outlet } from 'react-router-dom'
import { useSession } from '@/auth/SessionContext'
import { CalendarDays, BookOpen, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Layout() {
  const { session, logout, isAdmin } = useSession()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(10,10,10,0.85)',
          borderBottom: '1px solid #1e1e1e',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-12 flex items-center justify-between gap-4">
          {/* Logo */}
          <NavLink to="/book" className="flex items-center gap-2.5 shrink-0 group">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
              style={{ background: '#161616', border: '1px solid #2e2e2e' }}
            >
              ⚔️
            </div>
            <span
              className="font-display text-sm font-bold hidden sm:block"
              style={{ color: '#e8c96d', letterSpacing: '0.03em' }}
            >
              Iron Crusader
            </span>
          </NavLink>

          {/* Nav */}
          <nav className="flex items-center gap-0.5">
            {[
              { to: '/book',  icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Book' },
              { to: '/my',   icon: <BookOpen className="w-3.5 h-3.5" />,    label: 'My Bookings' },
              ...(isAdmin ? [{ to: '/admin', icon: <Settings className="w-3.5 h-3.5" />, label: 'Admin' }] : []),
            ].map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn('nav-item', isActive && 'active')}
              >
                {icon}
                <span className="hidden sm:block">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="flex items-center gap-2 shrink-0">
            {session && (
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-text leading-none">{session.user_name}</div>
                {isAdmin && <div className="text-xs text-gold mt-0.5">Admin</div>}
              </div>
            )}
            <button
              onClick={logout}
              title="Sign out"
              className="btn-icon"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-5 py-7 w-full">
        <Outlet />
      </main>

      <footer style={{ borderTop: '1px solid #1e1e1e' }} className="py-4">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
          <span className="text-xs text-subtle">Iron Crusader Warhammer Club</span>
          <span className="text-xs text-subtle">10:00 – 22:00</span>
        </div>
      </footer>
    </div>
  )
}
