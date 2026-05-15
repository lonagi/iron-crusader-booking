import { Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider } from '@/auth/SessionContext'
import { ToastProvider } from '@/lib/toast'
import { RequireAuth, RequireAdmin } from '@/auth/RequireAuth'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { BookPage } from '@/pages/BookPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { AdminPage } from '@/pages/AdminPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

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
