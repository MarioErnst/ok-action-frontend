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
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex-1 flex flex-col justify-center animate-fade-in relative z-10 w-full">
      <header className="mb-8 md:mb-12 text-center md:text-left relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 w-32 h-32 bg-accent/20 blur-[60px] rounded-full pointer-events-none animate-pulse-glow" />
        <p className="text-accent text-sm font-medium tracking-wider uppercase mb-2">Bienvenido de vuelta</p>
        <h1 className="text-text text-3xl md:text-5xl font-extrabold tracking-tight">
          {user?.fullName}
        </h1>
        <p className="text-text-muted mt-3 max-w-lg mx-auto md:mx-0 text-sm md:text-base">
          Selecciona un módulo para continuar con tu entrenamiento vocal y mejorar tu comunicación.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {MODULE_ITEMS.map((item, i) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            style={{ animationDelay: `${i * 100}ms` }}
            className="group relative flex flex-col items-center md:items-start text-center md:text-left gap-5 p-6 md:p-8 bg-surface/80 backdrop-blur-md border border-border rounded-3xl active:scale-95 hover:border-accent/60 md:hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-surface to-surface-alt border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner animate-float" style={{ animationDelay: `${i * 200}ms` }}>
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full opacity-50 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
              <NavIcon name={item.icon} active={false} size="lg" className="text-accent relative z-10" />
            </div>

            <div className="relative z-10">
              <h2 className="text-text font-bold text-xl mb-2 group-hover:text-accent transition-colors">{item.label}</h2>
              <p className="text-text-muted text-sm leading-relaxed line-clamp-3">
                {MODULE_DESCRIPTIONS[item.to]}
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-center md:justify-start gap-2 text-accent text-sm font-bold opacity-100 md:opacity-80 md:group-hover:opacity-100 mt-auto pt-2 w-full">
              <span className="uppercase tracking-wider text-xs">Comenzar</span>
              <svg
                className="w-4 h-4 transform group-hover:translate-x-1 animate-pulse-glow transition-transform duration-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
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
