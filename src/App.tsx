import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { usePreferences } from '@/preferences/PreferencesContext'
import { SessionProvider } from '@/auth/SessionContext'
import { ToastProvider } from '@/lib/toast'
import { RequireAuth, RequireAdmin } from '@/auth/RequireAuth'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { BookPage } from '@/pages/BookPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { AdminPage } from '@/pages/AdminPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const BetaPage = lazy(() => import('@/pages/BetaPage').then(module => ({ default: module.BetaPage })))

function BetaRoute() {
  const { t } = usePreferences()
  return <Suspense fallback={<div className="card p-10 text-center text-dim" role="status">{t('Loading')}</div>}><BetaPage /></Suspense>
}

export default function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/book" replace />} />
            <Route path="/book" element={<BookPage />} />
            <Route path="/beta" element={<BetaRoute />} />
            <Route path="/my" element={<MyBookingsPage />} />
            <Route
              path="/admin/*"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SessionProvider>
    </ToastProvider>
  )
}
