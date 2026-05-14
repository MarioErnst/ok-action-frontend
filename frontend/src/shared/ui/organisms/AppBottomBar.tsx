import { NavLink } from 'react-router-dom'
import { NavIcon } from '../atoms/NavIcon'
import { NAV_ITEMS, type NavItemConfig } from '../config/navItems'

// Five fixed slots, no hamburger / drawer. Order is:
//   [exercises] [capsules]  ⬤ dashboard  [live-session] [profile]
// The center slot is a raised FAB-style button; the other four share the
// same compact icon-and-label layout used elsewhere in the app.
//
// The mapping is path-based on purpose: if NAV_ITEMS gets reordered, the
// bar stays the same. Items that do not appear here (every per-module
// page) are still reachable from /ejercicios.
const ROUTE_BY_SLOT = {
  left1: '/ejercicios',
  left2: '/capsulas',
  center: '/dashboard',
  right1: '/sesion-libre',
  right2: '/perfil',
} as const

const findItem = (path: string): NavItemConfig | undefined =>
  NAV_ITEMS.find((item) => item.to === path)

export const AppBottomBar = () => {
  const left1 = findItem(ROUTE_BY_SLOT.left1)
  const left2 = findItem(ROUTE_BY_SLOT.left2)
  const center = findItem(ROUTE_BY_SLOT.center)
  const right1 = findItem(ROUTE_BY_SLOT.right1)
  const right2 = findItem(ROUTE_BY_SLOT.right2)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around bg-surface/90 backdrop-blur-xl border-t border-border/50 h-20 px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {left1 && <SideSlotLink item={left1} />}
      {left2 && <SideSlotLink item={left2} />}
      {center && <CenterSlotLink item={center} />}
      {right1 && <SideSlotLink item={right1} />}
      {right2 && <SideSlotLink item={right2} />}
    </nav>
  )
}

const SideSlotLink = ({ item }: { item: NavItemConfig }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className="relative flex flex-col items-center justify-center flex-1 h-16 group active:scale-95 transition-transform duration-200"
  >
    {({ isActive }) => (
      <>
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-300 ${
            isActive
              ? 'bg-accent shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse-glow'
              : 'bg-transparent'
          }`}
        />
        <div
          className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
            isActive
              ? 'bg-accent/10 scale-110 -translate-y-2'
              : 'group-hover:bg-surface-alt'
          }`}
        >
          <NavIcon
            name={item.icon}
            active={isActive}
            className={
              isActive
                ? 'text-accent drop-shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-float'
                : 'text-text-muted'
            }
          />
        </div>
        <span
          className={`text-[10px] font-medium absolute bottom-1 transition-all duration-300 ${
            isActive
              ? 'text-accent opacity-100 translate-y-0'
              : 'text-text-muted opacity-0 translate-y-2'
          }`}
        >
          {item.label}
        </span>
      </>
    )}
  </NavLink>
)

const CenterSlotLink = ({ item }: { item: NavItemConfig }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className="relative flex flex-col items-center justify-center -translate-y-4 z-10 mx-2"
  >
    {({ isActive }) => (
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-300 active:scale-90 animate-float ${
          isActive
            ? 'bg-accent scale-105 shadow-[0_0_30px_rgba(245,158,11,0.7)]'
            : 'bg-gradient-to-tr from-accent to-accent-hover'
        }`}
      >
        <NavIcon
          name={item.icon}
          active={true}
          size="lg"
          className={
            isActive
              ? 'text-text-on-accent'
              : 'text-text-on-accent opacity-90'
          }
        />
      </div>
    )}
  </NavLink>
)
