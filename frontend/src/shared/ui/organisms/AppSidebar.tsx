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
    className="group/sidebar hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col w-16 hover:w-52 duration-300 ease-out bg-surface border-r border-border overflow-hidden"
  >
    <NavLogo />
    <div className="h-px bg-border mx-3 shrink-0" />
    <nav className="flex-1 py-4 flex flex-col gap-1 overflow-hidden">
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
    <div className="h-px bg-border mx-3 shrink-0" />
    <NavUserBadge user={user} onLogout={onLogout} />
  </aside>
)
