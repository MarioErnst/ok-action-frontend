import { Outlet } from 'react-router-dom'
import { AppSidebar } from '../organisms/AppSidebar'
import { AppBottomBar } from '../organisms/AppBottomBar'
import { useAuthStore } from '../../../features/auth/presentation/store/authStore'
import { JourneyProvider } from '../../../features/journey'

export const AppLayout = () => {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  if (!user) return null

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col">
      <AppSidebar user={user} onLogout={logout} />
      <main className="lg:pl-20 pb-24 lg:pb-0 min-h-[100dvh] flex flex-col">
        <div className="flex-1 flex flex-col py-6">
          <Outlet />
        </div>
      </main>
      <AppBottomBar />
      <JourneyProvider />
    </div>
  )
}
