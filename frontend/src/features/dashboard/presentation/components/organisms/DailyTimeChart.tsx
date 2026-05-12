import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TimelinePoint } from '../../../../profile/domain/Timeline';

interface DailyTimeChartProps {
  daily: TimelinePoint[];
}

interface ChartDatum {
  date: string;
  label: string;
  minutes: number;
  sessionCount: number;
}

const dateLabelFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
});

const buildData = (daily: TimelinePoint[]): ChartDatum[] =>
  daily.map((point) => ({
    date: point.date,
    label: dateLabelFormatter.format(new Date(`${point.date}T00:00:00Z`)),
    minutes: Math.round(point.totalDurationMs / 60_000),
    sessionCount: point.sessionCount,
  }));

interface TooltipPayload {
  payload: ChartDatum;
}

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/80 bg-surface px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {datum.label}
      </p>
      <p className="mt-1 text-base font-extrabold text-accent">{datum.minutes} min</p>
      <p className="text-xs text-text-muted">
        {datum.sessionCount} {datum.sessionCount === 1 ? 'sesión' : 'sesiones'}
      </p>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex h-[220px] flex-col items-center justify-center gap-3 text-text-muted">
    <svg className="h-10 w-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
    <p className="text-sm font-medium">No hay tiempo registrado en este rango.</p>
  </div>
);

export const DailyTimeChart = ({ daily }: DailyTimeChartProps) => {
  if (daily.length === 0) return <EmptyState />;

  const data = buildData(daily);

  return (
    <div className="h-[220px] w-full md:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-alt)', fillOpacity: 0.4 }} />
          <Bar dataKey="minutes" fill="var(--color-accent)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
