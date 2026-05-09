import type { ConsistencyTimelineSegment } from '../../../domain/ConsistencySession'

interface Props {
  segments: ConsistencyTimelineSegment[]
}

export function ConsistencyTimelineList({ segments }: Props) {
  if (!segments.length) return null

  return (
    <div className="grid gap-2">
      {segments.map((segment) => (
        <div key={segment.segment} className="rounded-xl bg-surface-alt/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold capitalize text-text">{segment.segment}</p>
            <span className="text-sm font-black text-accent">{Math.round(segment.stability)}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">{segment.note}</p>
        </div>
      ))}
    </div>
  )
}
