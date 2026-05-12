import { useState } from 'react';

import { useAuthStore } from '../../../auth/presentation/store/authStore';
import { FILTER_LABELS } from '../../../profile/domain/ModuleLabels';
import type { TimelineModuleFilter, TimeRange } from '../../../profile/domain/Timeline';
import { useProfileTimeline } from '../../../profile/presentation/hooks/useProfileTimeline';
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
    <p className="text-xs">Intenta recargar la página.</p>
  </div>
);

export const DashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<TimeRange>('30d');
  const [module, setModule] = useState<TimelineModuleFilter>('all');

  const { data, isLoading, isError } = useProfileTimeline({ range, module });

  const moduleLabel = FILTER_LABELS[module];
  const performanceSubtitle =
    module === 'all'
      ? 'Promedio diario considerando todos los módulos.'
      : `Promedio diario en ${moduleLabel}.`;
  const timeSubtitle =
    module === 'all'
      ? 'Minutos de práctica por día.'
      : `Minutos de práctica diaria en ${moduleLabel}.`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 pb-24 md:p-8 lg:pb-8 animate-fade-in relative z-10">
      <header className="relative">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
        <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2 relative z-10">Tu progreso</p>
        <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight relative z-10">
          {user?.fullName ?? 'Hola'}
        </h1>
        <p className="text-text-muted mt-2 text-sm md:text-base relative z-10 max-w-xl">
          Filtra por módulo y rango temporal para ver tu evolución y cuánto tiempo le dedicas al entrenamiento.
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ModuleScrollChips value={module} onChange={setModule} />
        <div className="flex justify-end md:justify-start">
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      <ChartCard title="Rendimiento" subtitle={performanceSubtitle}>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : (
          <PerformanceChart daily={data?.daily ?? []} />
        )}
      </ChartCard>

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
  );
};
