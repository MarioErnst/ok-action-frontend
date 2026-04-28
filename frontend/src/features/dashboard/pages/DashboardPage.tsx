import { useNavigate } from 'react-router-dom'
import { NavIcon } from '../../../shared/ui/atoms/NavIcon'
import { useAuthStore } from '../../auth/presentation/store/authStore'
import { NAV_ITEMS } from '../../../shared/ui/config/navItems'

const MODULE_ITEMS = NAV_ITEMS.filter(item => item.to !== '/dashboard')

const MODULE_DESCRIPTIONS: Record<string, string> = {
  '/fonacion': 'Entrena la calidad y estabilidad de tu voz.',
  '/pronunciacion': 'Practica y evalúa tu pronunciación con frases reales.',
  '/acentuacion': 'Trabaja el énfasis y la acentuación correcta.',
  '/volumen': 'Calibra y controla la intensidad de tu voz.',
}

export const DashboardPage = () => {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10">
        <p className="text-text-muted text-sm mb-1">Bienvenido de vuelta</p>
        <h1 className="text-text text-3xl font-bold">{user?.fullName}</h1>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULE_ITEMS.map(item => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="group flex flex-col gap-4 p-6 bg-surface border border-border rounded-2xl text-left hover:border-accent/50 hover:bg-surface-alt hover:shadow-[0_0_24px_0_rgba(245,158,11,0.07)] transition-all duration-300 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300">
              <NavIcon name={item.icon} active={false} size="lg" className="text-accent" />
            </div>

            <div>
              <h2 className="text-text font-semibold text-lg mb-1">{item.label}</h2>
              <p className="text-text-muted text-sm leading-relaxed">
                {MODULE_DESCRIPTIONS[item.to]}
              </p>
            </div>

            <div className="flex items-center gap-1 text-accent text-sm font-medium opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200">
              <span>Comenzar</span>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </section>
    </div>
  )
}
