import { NavLink } from 'react-router-dom'
import { NavIcon } from '../atoms/NavIcon'
import { NavIndicator } from '../atoms/NavIndicator'
import type { NavIconName } from '../atoms/NavIcon'

type NavItemProps = {
  to: string
  icon: NavIconName
  label: string
  end?: boolean
  indicatorVariant?: 'vertical' | 'horizontal'
  journeyId?: string
}

export const NavItem = ({ to, icon, label, end, indicatorVariant = 'vertical', journeyId }: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    data-journey-id={journeyId}
    className={({ isActive }) =>
      `relative flex items-center gap-3 mx-2 px-4 py-2.5 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
        isActive
          ? 'bg-accent/15 hover:bg-accent/20'
          : 'hover:bg-surface-alt'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <NavIndicator active={isActive} variant={indicatorVariant} />
        <NavIcon name={icon} active={isActive} />
        <span
          className={`text-sm font-medium whitespace-nowrap transition-[opacity,color] duration-200 delay-100 opacity-0 group-hover/sidebar:opacity-100 ${
            isActive ? 'text-accent font-semibold' : 'text-text-muted'
          }`}
        >
          {label}
        </span>
      </>
    )}
  </NavLink>
)
