import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

// Frame around every chart on the dashboard. Centralizes spacing,
// background, border and the title/action header so each organism only
// renders the chart itself. overflow-hidden clips any decorative element
// whose absolute positioning leaks past the rounded border (e.g. the
// glow halo inside InitialRadar with inset-[-20%]) — without it the
// halo extends past the page padding and produces a horizontal scroll
// on narrow viewports.
export const ChartCard = ({ title, subtitle, action, children }: ChartCardProps) => (
  <section className="rounded-3xl border border-border/60 bg-surface/60 backdrop-blur-sm p-4 md:p-6 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base md:text-lg font-extrabold text-text tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs md:text-sm text-text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
    <div className="w-full">{children}</div>
  </section>
);
