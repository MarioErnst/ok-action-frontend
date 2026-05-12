import type { FluencyStuckEvent } from '../../../domain/FluencySession'

interface Props {
  events: FluencyStuckEvent[]
}

export function FluencyStuckEventsList({ events }: Props) {
  if (!events.length) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
        Palabras trabadas
      </p>
      {events.map((event, index) => (
        <div key={`${event.word}-${index}`} className="rounded-xl bg-surface-alt/60 p-3">
          <p className="text-sm font-bold text-text">
            {event.word} <span className="text-text-muted">x{event.count}</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">{event.ctx}</p>
        </div>
      ))}
    </div>
  )
}
