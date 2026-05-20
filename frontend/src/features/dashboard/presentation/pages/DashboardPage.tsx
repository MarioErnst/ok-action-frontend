import { useState } from 'react';

import { useAuthStore } from '../../../auth/presentation/store/authStore';
import { APP_OVERVIEW_GUIDE_ID, useJourneyStore } from '../../../journey';
import { FILTER_LABELS } from '../../../profile/domain/ModuleLabels';
import type { TimelineModuleFilter, TimeRange } from '../../../profile/domain/Timeline';
import { useProfileTimeline } from '../../../profile/presentation/hooks/useProfileTimeline';
import { INITIAL_SCORES } from '../../../welcome/domain/InitialScores';
import { InitialRadar } from '../../../welcome/presentation/components/organisms/InitialRadar';
import { ChartCard } from '../components/atoms/ChartCard';
import { ModuleScrollChips } from '../components/molecules/ModuleScrollChips';
import { TimeRangeSelector } from '../components/molecules/TimeRangeSelector';
import { DailyTimeChart } from '../components/organisms/DailyTimeChart';
import { PerformanceChart } from '../components/organisms/PerformanceChart';

const LoadingState = () => (
  <div className="flex h-[260px] w-full items-center justify-center">
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-surface-alt border-t-accent" />
  </div>
);

const ErrorState = () => (
  <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-text-muted">
    <p className="text-sm">No pudimos cargar tus datos.</p>
    <p className="text-xs">{'Intenta recargar la p\u00e1gina.'}</p>
  </div>
);

export const DashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  const startGuide = useJourneyStore((s) => s.startGuide);
  const [range, setRange] = useState<TimeRange>('30d');
  const [module, setModule] = useState<TimelineModuleFilter>('all');

  const { data, isLoading, isError } = useProfileTimeline({ range, module });

  const moduleLabel = FILTER_LABELS[module];
  const performanceSubtitle =
    module === 'all'
      ? 'Promedio diario considerando todos los m\u00f3dulos.'
      : `Promedio diario en ${moduleLabel}.`;
  const timeSubtitle =
    module === 'all'
      ? 'Minutos de pr\u00e1ctica por d\u00eda.'
      : `Minutos de pr\u00e1ctica diaria en ${moduleLabel}.`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 pb-24 md:p-8 lg:pb-8 animate-fade-in relative z-10">
      <header className="relative" data-journey-id="dashboard-progress">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
        <div className="relative z-10 flex flex-row items-start justify-between gap-4">
          <div>
            <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">
              Tu progreso
            </p>
            <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">
              {user?.fullName ?? 'Hola'}
            </h1>
            <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">
              {'Filtra por m\u00f3dulo y rango temporal para ver tu evoluci\u00f3n y cu\u00e1nto tiempo le dedicas al entrenamiento.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => startGuide(APP_OVERVIEW_GUIDE_ID)}
            className="min-h-[40px] w-fit rounded-full border border-accent/40 px-4 text-sm font-bold text-accent transition-colors hover:bg-accent/10"
          >
            Ayuda
          </button>
        </div>
      </header>

      <div
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        data-journey-id="dashboard-filters"
      >
        <ModuleScrollChips value={module} onChange={setModule} />
        <div className="flex justify-end md:justify-start">
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      <div data-journey-id="dashboard-performance">
        <ChartCard title="Rendimiento" subtitle={performanceSubtitle}>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState />
          ) : (
            <PerformanceChart daily={data?.daily ?? []} />
          )}
        </ChartCard>
      </div>

      <div data-journey-id="dashboard-time">
        <ChartCard title="Tiempo diario" subtitle={timeSubtitle}>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState />
          ) : (
            <DailyTimeChart daily={data?.daily ?? []} />
          )}
        </ChartCard>
      </div>

      {/* Initial baseline radar: the same component the welcome page shows
          on first launch. Surfaces here so the dashboard always exposes the
          per-module starting scores below the daily progress charts,
          without forcing the user back to /bienvenida. Wrapped in its own
          data-journey-id slot to keep the dashboard structure consistent
          with the other chart blocks introduced by the contextual guides. */}
      <div data-journey-id="dashboard-initial-radar">
        <ChartCard
          title="Tu punto de partida"
          subtitle="Promedio inicial por módulo basado en tu primera sesión."
        >
          <div className="flex justify-center w-full pb-4">
            <InitialRadar dimensions={INITIAL_SCORES} />
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
