import { NavLink } from 'react-router-dom'
import type { User } from '../../../features/auth/domain/entities/User'

type NavUserBadgeProps = {
  user: User
  onLogout: () => void
}

const getInitials = (fullName: string): string =>
  fullName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

export const NavUserBadge = ({ user, onLogout }: NavUserBadgeProps) => (
  <div className="flex items-center gap-3 px-4 py-4 overflow-hidden">
    <NavLink
      to="/perfil"
      aria-label="Ir al perfil"
      className={({ isActive }) =>
        `w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          isActive
            ? 'bg-accent/30 border-accent shadow-[0_0_12px_-2px_rgba(245,158,11,0.6)]'
            : 'bg-accent/20 border-accent/30 hover:bg-accent/30'
        }`
      }
    >
      <span className="text-accent text-xs font-bold">{getInitials(user.fullName)}</span>
    </NavLink>
    <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100 min-w-0 flex flex-col items-start">
      <NavLink
        to="/perfil"
        className={({ isActive }) =>
          `text-xs font-medium whitespace-nowrap truncate max-w-[120px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline ${
            isActive ? 'text-accent font-semibold' : 'text-text hover:text-accent'
          }`
        }
      >
        {user.fullName}
      </NavLink>
      <button
        onClick={onLogout}
        className="text-text-muted text-xs hover:text-danger transition-colors cursor-pointer focus-visible:outline-none focus-visible:text-danger"
      >
        Salir
      </button>
    </div>
  </div>
)
