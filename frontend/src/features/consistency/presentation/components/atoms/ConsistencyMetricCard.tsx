interface Props {
  label: string
  value: number | string
}

export function ConsistencyMetricCard({ label, value }: Props) {
  return (
    <div className="rounded-xl bg-surface-alt/70 p-3 text-center">
      <p className="text-lg font-bold text-text">{value}</p>
      <p className="text-[11px] text-text-muted">{label}</p>
    </div>
  )
}
