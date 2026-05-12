import { Link } from 'react-router-dom'

export const NavLogo = () => (
  <Link
    to="/dashboard"
    className="flex items-center gap-2 px-4 py-5 overflow-hidden hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-md"
    aria-label="Ir al inicio"
  >
    <span className="text-accent text-lg font-black tracking-tight shrink-0">OK</span>
    <span className="text-text text-lg font-light tracking-widest whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100">
      ACTION
    </span>
  </Link>
)
