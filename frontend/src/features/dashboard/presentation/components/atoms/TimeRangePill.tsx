import type { TimeRange } from '../../../../profile/domain/Timeline';

interface TimeRangePillProps {
  value: TimeRange;
  label: string;
  isActive: boolean;
  onSelect: (value: TimeRange) => void;
}

// One pill inside the segmented control. Active state uses the accent
// token so the selector mirrors the chip/legend palette across charts.
export const TimeRangePill = ({ value, label, isActive, onSelect }: TimeRangePillProps) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    aria-pressed={isActive}
    className={`min-h-[36px] min-w-[44px] px-3 py-1.5 text-xs md:text-sm font-bold tracking-wide rounded-full transition-all duration-200 ${
      isActive
        ? 'bg-accent text-text-on-accent shadow-[0_4px_14px_-4px_rgba(245,158,11,0.6)]'
        : 'bg-surface-alt/60 text-text-muted hover:bg-surface-alt hover:text-text'
    }`}
  >
    {label}
  </button>
);
