import { Outlet } from 'react-router-dom'
import { AppSidebar } from '../organisms/AppSidebar'
import { AppBottomBar } from '../organisms/AppBottomBar'
import { useAuthStore } from '../../../features/auth/presentation/store/authStore'

export const AppLayout = () => {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg">
      <AppSidebar user={user} onLogout={logout} />
      <main className="lg:pl-16 pb-16 lg:pb-0 min-h-screen">
        <Outlet />
      </main>
      <AppBottomBar />
    </div>
  )
}
