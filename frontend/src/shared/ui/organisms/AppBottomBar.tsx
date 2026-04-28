import { NavLink } from 'react-router-dom'
import { NavIcon } from '../atoms/NavIcon'
import { NavIndicator } from '../atoms/NavIndicator'
import { NAV_ITEMS } from '../config/navItems'

export const AppBottomBar = () => (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-surface border-t border-border h-16 px-2">
    {NAV_ITEMS.map(item => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className="relative flex flex-col items-center justify-center flex-1 h-full"
      >
        {({ isActive }) => (
          <>
            <NavIndicator active={isActive} variant="horizontal" />
            <NavIcon name={item.icon} active={isActive} />
          </>
        )}
      </NavLink>
    ))}
  </nav>
)
