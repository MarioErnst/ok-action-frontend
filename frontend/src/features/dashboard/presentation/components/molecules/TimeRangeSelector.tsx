import type { TimeRange } from '../../../../profile/domain/Timeline';
import { TimeRangePill } from '../atoms/TimeRangePill';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
];

// Segmented control for the time window. Shared by both charts so a
// single selector applies to performance and dedication at once.
export const TimeRangeSelector = ({ value, onChange }: TimeRangeSelectorProps) => (
  <div className="inline-flex items-center gap-1 rounded-full bg-surface-alt/40 p-1" role="group" aria-label="Rango temporal">
    {OPTIONS.map((option) => (
      <TimeRangePill
        key={option.value}
        value={option.value}
        label={option.label}
        isActive={option.value === value}
        onSelect={onChange}
      />
    ))}
  </div>
);
