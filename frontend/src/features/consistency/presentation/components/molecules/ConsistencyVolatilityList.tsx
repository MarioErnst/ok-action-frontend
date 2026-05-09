import type { ConsistencyVolatilityEvent } from '../../../domain/ConsistencySession'

interface Props {
  events: ConsistencyVolatilityEvent[]
}

export function ConsistencyVolatilityList({ events }: Props) {
  if (!events.length) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
        Cambios detectados
      </p>
      {events.map((event, index) => (
        <div key={`${event.area}-${index}`} className="rounded-xl bg-surface-alt/60 p-3">
          <p className="text-sm font-bold text-text">
            {event.area} <span className="text-text-muted">({event.segment})</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">{event.note}</p>
          <p className="mt-1 text-xs text-accent">{event.suggestion}</p>
        </div>
      ))}
    </div>
  )
}
