import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import type { RadarDimension } from '../../../domain/InitialScores';

type InitialRadarProps = {
  dimensions: RadarDimension[];
};

type AxisTickProps = {
  x?: number;
  y?: number;
  textAnchor?: 'start' | 'middle' | 'end' | 'inherit';
  payload?: { value: string };
};

// Wraps multi-word labels onto two lines via <tspan> so labels like
// "Expr. facial" don't overflow horizontally on narrow viewports. Inherits
// the textAnchor recharts already computes from the slice angle, so labels
// on the right side push right, on the left push left, and on the top/bottom
// stay centered.
const AxisTick = ({ x = 0, y = 0, textAnchor = 'middle', payload }: AxisTickProps) => {
  const words = (payload?.value ?? '').split(' ');
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      fill="var(--color-text-muted)"
      fontSize={11}
    >
      {words.map((word, index) => (
        <tspan key={`${word}-${index}`} x={x} dy={index === 0 ? 0 : 12}>
          {word}
        </tspan>
      ))}
    </text>
  );
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
        <RadarChart data={data} outerRadius="65%" margin={{ top: 24, right: 32, bottom: 24, left: 32 }}>
          <PolarGrid stroke="var(--color-border)" strokeOpacity={0.35} gridType="polygon" />
          <PolarAngleAxis dataKey="label" tick={<AxisTick />} />
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
