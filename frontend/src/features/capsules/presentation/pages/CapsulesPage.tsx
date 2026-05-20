import { ModuleGuideLauncher } from '../../../journey';
import { VideoCapsulesSection } from '../components/organisms/VideoCapsulesSection';

export const CapsulesPage = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 pb-24 md:p-8 lg:pb-8 animate-fade-in relative z-10">
    <header className="relative" data-journey-id="capsules-intro">
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
      <div className="relative z-10 flex flex-row items-start justify-between gap-4">
        <div>
          <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">
            Aprendizaje
          </p>
          <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">
            Capsulas
          </h1>
          <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">
            Videos cortos que explican tecnicas, contexto y ejercicios complementarios. Elige uno para verlo.
          </p>
        </div>
        <div className="shrink-0 mt-1"><ModuleGuideLauncher guideId="capsules" /></div>
      </div>
    </header>

    <div data-journey-id="capsules-list">
      <VideoCapsulesSection />
    </div>
  </div>
);

