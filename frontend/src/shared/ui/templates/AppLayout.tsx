import { Outlet, Link } from 'react-router-dom'
import { AppSidebar } from '../organisms/AppSidebar'
import { AppBottomBar } from '../organisms/AppBottomBar'
import { useAuthStore } from '../../../features/auth/presentation/store/authStore'

export const AppLayout = () => {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  if (!user) return null

  const getInitials = (fullName: string): string =>
    fullName
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase()

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex justify-end p-4 z-40 fixed top-0 right-0 left-0 bg-bg/80 backdrop-blur-md border-b border-border/50">
        <Link to="/perfil" className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 overflow-hidden shadow-sm active:scale-95 transition-transform duration-200">
          {user.avatar ? (
            <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-accent text-sm font-bold">{getInitials(user.fullName)}</span>
          )}
        </Link>
      </div>

      <AppSidebar user={user} onLogout={logout} />
      <main className="lg:pl-20 pb-24 pt-20 lg:pt-0 lg:pb-0 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <AppBottomBar />
    </div>
  )
}
