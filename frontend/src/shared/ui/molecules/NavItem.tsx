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
}

export const NavItem = ({ to, icon, label, end, indicatorVariant = 'vertical' }: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `relative flex items-center gap-3 mx-2 px-4 py-2.5 rounded-xl transition-colors duration-200 hover:bg-surface-alt ${
        isActive ? 'bg-accent/10' : ''
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
