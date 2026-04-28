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
    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
      <span className="text-accent text-xs font-bold">{getInitials(user.fullName)}</span>
    </div>
    <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100 min-w-0">
      <p className="text-text text-xs font-medium whitespace-nowrap truncate max-w-[120px]">
        {user.fullName}
      </p>
      <button
        onClick={onLogout}
        className="text-text-muted text-xs hover:text-danger transition-colors cursor-pointer"
      >
        Salir
      </button>
    </div>
  </div>
)
