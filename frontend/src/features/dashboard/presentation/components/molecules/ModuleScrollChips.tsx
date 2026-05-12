import { FILTER_LABELS, MODULE_ORDER } from '../../../../profile/domain/ModuleLabels';
import type { TimelineModuleFilter } from '../../../../profile/domain/Timeline';

interface ModuleScrollChipsProps {
  value: TimelineModuleFilter;
  onChange: (value: TimelineModuleFilter) => void;
}

// Horizontal touch-scrollable chip selector. "Todos" is pinned first so
// it is always reachable without scrolling. The list scales to many
// modules without breaking layout on narrow screens.
export const ModuleScrollChips = ({ value, onChange }: ModuleScrollChipsProps) => {
  const items: TimelineModuleFilter[] = ['all', ...MODULE_ORDER];

  return (
    <div
      className="-mx-4 md:-mx-0 overflow-x-auto"
      role="tablist"
      aria-label="Filtrar por módulo"
    >
      <div className="flex gap-2 px-4 md:px-0 pb-1 snap-x snap-mandatory">
        {items.map((item) => {
          const isActive = item === value;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item)}
              className={`snap-start whitespace-nowrap min-h-[44px] px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-200 ${
                isActive
                  ? 'bg-accent text-text-on-accent shadow-[0_6px_20px_-8px_rgba(245,158,11,0.7)]'
                  : 'bg-surface/60 text-text-muted border border-border/60 hover:border-accent/40 hover:text-text'
              }`}
            >
              {FILTER_LABELS[item]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
