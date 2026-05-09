interface Props {
  label: string
  value: number | string
  suffix?: string
}

export function FluencyMetricCard({ label, value, suffix }: Props) {
  return (
    <div className="rounded-xl bg-surface-alt/70 p-3 text-center">
      <p className="text-lg font-bold text-text">
        {value}
        {suffix && <span className="ml-1 text-[10px] text-text-muted">{suffix}</span>}
      </p>
      <p className="text-[11px] text-text-muted">{label}</p>
    </div>
  )
}
