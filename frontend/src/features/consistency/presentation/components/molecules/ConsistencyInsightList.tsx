type Tone = 'success' | 'warning'

const TONE_CLASS: Record<Tone, string> = {
  success: 'border-success/30 bg-success/5 text-success',
  warning: 'border-warning/30 bg-warning/5 text-warning',
}

interface Props {
  title: string
  items: string[]
  tone: Tone
}

export function ConsistencyInsightList({ title, items, tone }: Props) {
  if (!items.length) return null

  return (
    <div className={`rounded-xl border p-3 ${TONE_CLASS[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {items.slice(0, 2).map((item) => (
          <li key={item} className="text-xs text-text-muted">{item}</li>
        ))}
      </ul>
    </div>
  )
}
