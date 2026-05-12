import { useNavigate } from 'react-router-dom';

import { NavIcon } from '../../../../shared/ui/atoms/NavIcon';
import { NAV_ITEMS } from '../../../../shared/ui/config/navItems';

// Catalog of every exercise module the user can launch. Lifted out of the
// old DashboardPage so the dashboard can focus on progress charts and
// this page becomes the canonical entry point to practice.
const MODULE_ITEMS = NAV_ITEMS.filter(
  (item) => item.to !== '/dashboard' && item.to !== '/perfil' && item.to !== '/ejercicios',
);

const MODULE_DESCRIPTIONS: Record<string, string> = {
  '/fonacion': 'Entrena la calidad y estabilidad de tu voz.',
  '/pronunciacion': 'Practica y evalúa tu pronunciación con frases reales.',
  '/acentuacion': 'Trabaja el énfasis y la acentuación correcta.',
  '/volumen': 'Calibra y controla la intensidad de tu voz.',
  '/pausas': 'Detecta silencios relevantes y aprende a usar pausas con intención.',
  '/muletillas': 'Identifica palabras de relleno que pueden debilitar tu mensaje.',
  '/precision': 'Evalúa si tu respuesta mantiene claridad, foco y coherencia.',
  '/sesion-libre': 'Practica una respuesta completa con feedback integrado.',
  '/fluidez': 'Reduce trabas, repeticiones y reinicios al hablar.',
  '/consistencia': 'Evalúa si mantienes ritmo, claridad, foco y seguridad.',
  '/expresion-facial': 'Analiza tus expresiones faciales frente a cámara.',
  '/expresion-corporal': 'Analiza postura, gestos, apertura y estabilidad frente a cámara.',
  '/versatilidad-linguistica': 'Trabaja tu riqueza de vocabulario y variedad expresiva.',
};

export const ExercisesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full animate-fade-in relative z-10">
      <header className="mb-6 md:mb-10 text-center md:text-left relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 w-32 h-32 bg-accent/20 blur-[60px] rounded-full pointer-events-none animate-pulse-glow" />
        <p className="text-accent text-xs md:text-sm font-medium tracking-wider uppercase mb-2">Catálogo</p>
        <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Ejercicios</h1>
        <p className="text-text-muted mt-2 max-w-xl mx-auto md:mx-0 text-sm md:text-base">
          Elige un módulo para empezar a entrenar. Cada uno mide y devuelve feedback específico sobre un aspecto de tu comunicación.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {MODULE_ITEMS.map((item, i) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            style={{ animationDelay: `${i * 80}ms` }}
            className="group relative flex flex-col items-center md:items-start text-center md:text-left gap-5 p-6 bg-surface/80 backdrop-blur-md border border-border rounded-3xl active:scale-95 hover:border-accent/60 md:hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />

            <div
              className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-surface to-surface-alt border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner"
            >
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full opacity-50 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
              <NavIcon name={item.icon} active={false} size="lg" className="text-accent relative z-10" />
            </div>

            <div className="relative z-10">
              <h2 className="text-text font-bold text-lg md:text-xl mb-2 group-hover:text-accent transition-colors">{item.label}</h2>
              <p className="text-text-muted text-sm leading-relaxed line-clamp-3">
                {MODULE_DESCRIPTIONS[item.to] ?? ''}
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-center md:justify-start gap-2 text-accent text-sm font-bold opacity-100 md:opacity-80 md:group-hover:opacity-100 mt-auto pt-2 w-full">
              <span className="uppercase tracking-wider text-xs">Comenzar</span>
              <svg
                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
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
  );
};
