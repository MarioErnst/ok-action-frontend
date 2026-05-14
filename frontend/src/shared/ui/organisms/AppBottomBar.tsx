import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NavIcon } from '../atoms/NavIcon'
import { NAV_ITEMS } from '../config/navItems'

const JOURNEY_NAV_IDS: Record<string, string> = {
  '/ejercicios': 'nav-exercises',
  '/capsulas': 'nav-capsules',
  '/sesion-libre': 'nav-live-session',
  '/perfil': 'nav-profile',
}

export const AppBottomBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const centerItem = NAV_ITEMS.find(i => i.to === '/dashboard')
  const sideItems = NAV_ITEMS.filter(i => i.to !== '/dashboard')
  
  const leftItems = sideItems.slice(0, 2)
  const rightItems = sideItems.slice(2, 3) // Only 1 item on the right
  const menuItems = sideItems.slice(3) // The rest goes into the menu

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around bg-surface/90 backdrop-blur-xl border-t border-border/50 h-20 px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {leftItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-journey-id={JOURNEY_NAV_IDS[item.to]}
            onClick={() => setIsMenuOpen(false)}
            className="relative flex flex-col items-center justify-center flex-1 h-16 group active:scale-95 transition-transform duration-200"
          >
            {({ isActive }) => (
              <>
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-300 ${isActive ? 'bg-accent shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse-glow' : 'bg-transparent'}`} />
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-accent/10 scale-110 -translate-y-2' : 'group-hover:bg-surface-alt'}`}>
                  <NavIcon name={item.icon} active={isActive} className={isActive ? 'text-accent drop-shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-float' : 'text-text-muted'} />
                </div>
                <span className={`text-[10px] font-medium absolute bottom-1 transition-all duration-300 ${isActive ? 'text-accent opacity-100 translate-y-0' : 'text-text-muted opacity-0 translate-y-2'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {centerItem && (
          <NavLink
            to={centerItem.to}
            end={centerItem.end}
            data-journey-id={JOURNEY_NAV_IDS[centerItem.to]}
            onClick={() => setIsMenuOpen(false)}
            className="relative flex flex-col items-center justify-center -translate-y-4 z-10 mx-2"
          >
            {({ isActive }) => (
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-300 active:scale-90 animate-float ${isActive ? 'bg-accent scale-105 shadow-[0_0_30px_rgba(245,158,11,0.7)]' : 'bg-gradient-to-tr from-accent to-accent-hover'}`}>
                <NavIcon name={centerItem.icon} active={true} size="lg" className={isActive ? 'text-text-on-accent' : 'text-text-on-accent opacity-90'} />
              </div>
            )}
          </NavLink>
        )}

        {rightItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-journey-id={JOURNEY_NAV_IDS[item.to]}
            onClick={() => setIsMenuOpen(false)}
            className="relative flex flex-col items-center justify-center flex-1 h-16 group active:scale-95 transition-transform duration-200"
          >
            {({ isActive }) => (
              <>
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-300 ${isActive ? 'bg-accent shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse-glow' : 'bg-transparent'}`} />
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-accent/10 scale-110 -translate-y-2' : 'group-hover:bg-surface-alt'}`}>
                  <NavIcon name={item.icon} active={isActive} className={isActive ? 'text-accent drop-shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-float' : 'text-text-muted'} />
                </div>
                <span className={`text-[10px] font-medium absolute bottom-1 transition-all duration-300 ${isActive ? 'text-accent opacity-100 translate-y-0' : 'text-text-muted opacity-0 translate-y-2'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="relative flex flex-col items-center justify-center flex-1 h-16 group active:scale-95 transition-transform duration-200"
        >
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-300 ${isMenuOpen ? 'bg-accent shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse-glow' : 'bg-transparent'}`} />
          <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isMenuOpen ? 'bg-accent/10 scale-110 -translate-y-2' : 'group-hover:bg-surface-alt'}`}>
            <svg
              className={`w-5 h-5 shrink-0 transition-colors duration-200 ${isMenuOpen ? 'text-accent drop-shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-float' : 'text-text-muted'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
          <span className={`text-[10px] font-medium absolute bottom-1 transition-all duration-300 ${isMenuOpen ? 'text-accent opacity-100 translate-y-0' : 'text-text-muted opacity-0 translate-y-2'}`}>
            Menú
          </span>
        </button>
      </nav>

      {/* Drawer Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Drawer Menu */}
      <div className={`lg:hidden fixed bottom-20 left-0 right-0 z-40 bg-surface border-t border-border/50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex flex-col p-4 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
          <div className="grid grid-cols-2 gap-2 pb-safe">
            {menuItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-journey-id={JOURNEY_NAV_IDS[item.to]}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 p-3 rounded-2xl transition-all ${isActive ? 'bg-accent/10 text-accent' : 'text-text hover:bg-surface-alt'}`}
              >
                {({ isActive }) => (
                  <>
                    <NavIcon name={item.icon} active={isActive} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
