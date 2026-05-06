import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/presentation/store/authStore'

export const ProtectedRoute = () => {
  const user = useAuthStore(s => s.user)
  return user ? <Outlet /> : <Navigate to="/auth" replace />
}
