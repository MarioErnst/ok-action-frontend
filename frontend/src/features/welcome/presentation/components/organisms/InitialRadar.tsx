import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import type { RadarDimension } from '../../../domain/InitialScores';

type InitialRadarProps = {
  dimensions: RadarDimension[];
};

export const InitialRadar = ({ dimensions }: InitialRadarProps) => {
  const data = dimensions.map((d) => ({ label: d.label, score: d.score }));

  return (
    <div
      className="relative w-full max-w-[520px] aspect-square animate-fade-in"
      style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
    >
      <div
        className="pointer-events-none absolute inset-[-20%] rounded-full bg-accent/15 blur-[80px] animate-pulse-glow"
        aria-hidden
      />
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%" margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
          <PolarGrid stroke="var(--color-border)" strokeOpacity={0.35} gridType="polygon" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tickCount={5}
            tick={false}
            axisLine={false}
            stroke="var(--color-border)"
          />
          <Radar
            name="score"
            dataKey="score"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="var(--color-accent)"
            fillOpacity={0.28}
            dot={{ r: 3, fill: 'var(--color-accent)', stroke: 'var(--color-accent)' }}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
