interface ModuleTabPillProps {
  label: string
  active: boolean
  // Optional event count rendered as a small badge next to the label.
  count?: number
  onClick: () => void
}

// Tab pill used in the feedback page to switch between module
// sections. Active state uses the accent colour; inactive stays muted
// so the active pill clearly leads the eye. Tap area is enforced via
// min-h-[44px] so mobile users always have a 44 px target.
export const ModuleTabPill = ({ label, active, count, onClick }: ModuleTabPillProps) => {
  const base =
    'flex items-center gap-2 rounded-full px-4 min-h-[44px] text-sm font-medium ' +
    'transition-colors duration-200 cursor-pointer whitespace-nowrap'
  const cls = active
    ? `${base} bg-accent text-text-on-accent`
    : `${base} bg-surface-alt text-text-muted hover:text-text hover:bg-surface`
  return (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-xs font-bold rounded-full px-2 py-0.5 ${
            active ? 'bg-text-on-accent/10 text-text-on-accent' : 'bg-bg/70 text-text'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}
