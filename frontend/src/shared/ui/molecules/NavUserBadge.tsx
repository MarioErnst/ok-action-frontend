import { Link } from 'react-router-dom'
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
    <Link to="/perfil" className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 hover:bg-accent/30 transition-colors cursor-pointer">
      <span className="text-accent text-xs font-bold">{getInitials(user.fullName)}</span>
    </Link>
    <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100 min-w-0 flex flex-col items-start">
      <Link to="/perfil" className="text-text text-xs font-medium whitespace-nowrap truncate max-w-[120px] hover:text-accent transition-colors cursor-pointer">
        {user.fullName}
      </Link>
      <button
        onClick={onLogout}
        className="text-text-muted text-xs hover:text-danger transition-colors cursor-pointer"
      >
        Salir
      </button>
    </div>
  </div>
)
