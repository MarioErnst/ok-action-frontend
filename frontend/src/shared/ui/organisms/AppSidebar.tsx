import { NavLogo } from '../molecules/NavLogo'
import { NavItem } from '../molecules/NavItem'
import { NavUserBadge } from '../molecules/NavUserBadge'
import { NAV_ITEMS } from '../config/navItems'
import type { User } from '../../../features/auth/domain/entities/User'

type AppSidebarProps = {
  user: User
  onLogout: () => void
}

export const AppSidebar = ({ user, onLogout }: AppSidebarProps) => (
  <aside
    style={{ transitionProperty: 'width' }}
    className="group/sidebar hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col w-20 hover:w-64 duration-300 ease-out bg-surface/80 backdrop-blur-2xl border-r border-border/50 overflow-hidden shadow-[10px_0_40px_rgba(0,0,0,0.3)]"
  >
    <div className="pt-6 pb-2">
      <NavLogo />
    </div>
    
    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4 my-2 opacity-50 shrink-0" />
    
    <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 custom-scrollbar">
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.label}
          end={item.end}
        />
      ))}
    </nav>
    
    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4 my-2 opacity-50 shrink-0" />
    
    <div className="pb-4">
      <NavUserBadge user={user} onLogout={onLogout} />
    </div>
  </aside>
)
