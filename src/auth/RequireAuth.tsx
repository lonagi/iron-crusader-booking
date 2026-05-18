import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from './SessionContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session } = useSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, isAdmin } = useSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/book" replace />
  }

  return <>{children}</>
}
