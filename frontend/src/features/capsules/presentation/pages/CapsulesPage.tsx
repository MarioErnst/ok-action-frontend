import { VideoCapsulesSection } from '../components/organisms/VideoCapsulesSection';

export const CapsulesPage = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 pb-24 md:p-8 lg:pb-8 animate-fade-in relative z-10">
    <header className="relative">
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
      <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2 relative z-10">
        Aprendizaje
      </p>
      <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight relative z-10">
        Cápsulas
      </h1>
      <p className="text-text-muted mt-2 text-sm md:text-base relative z-10 max-w-xl">
        Videos cortos que explican técnicas, contexto y ejercicios complementarios. Elegí uno para verlo.
      </p>
    </header>

    <VideoCapsulesSection />
  </div>
);
