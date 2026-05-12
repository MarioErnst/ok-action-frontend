import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TimelinePoint } from '../../../../profile/domain/Timeline';

interface PerformanceChartProps {
  daily: TimelinePoint[];
}

interface ChartDatum {
  date: string;
  label: string;
  avgScore: number | null;
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
    avgScore: point.avgScore,
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
      <p className="mt-1 text-base font-extrabold text-accent">
        {datum.avgScore !== null ? `${datum.avgScore} pts` : 'Sin score'}
      </p>
      <p className="text-xs text-text-muted">
        {datum.sessionCount} {datum.sessionCount === 1 ? 'sesión' : 'sesiones'}
      </p>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-text-muted">
    <svg className="h-10 w-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M21 7h-5M21 7v5" />
    </svg>
    <p className="text-sm font-medium">Aún no hay práctica registrada en este rango.</p>
  </div>
);

export const PerformanceChart = ({ daily }: PerformanceChartProps) => {
  if (daily.length === 0) return <EmptyState />;

  const data = buildData(daily);

  return (
    <div className="h-[260px] w-full md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
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
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-accent)', strokeOpacity: 0.3 }} />
          <Line
            type="monotone"
            dataKey="avgScore"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'var(--color-accent)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
