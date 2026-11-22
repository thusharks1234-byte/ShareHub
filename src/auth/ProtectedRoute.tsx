import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { StateMessage } from '../components/ui/StateMessage'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="account-state"><StateMessage kind="loading" message="Restoring your secure session." title="Checking your account" /></div>
  }
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />
  return <Outlet />
}
