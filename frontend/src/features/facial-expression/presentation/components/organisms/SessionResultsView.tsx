import type { EmotionId, GestureId, SessionResult } from '../../../domain/FacialExpression'
import { EmotionLabel } from '../atoms/EmotionLabel'
import { EmotionBar } from '../atoms/EmotionBar'
import { IntensityRing } from '../atoms/IntensityRing'
import { GESTURE_LABELS } from '../emotionStyles'

type Props = {
  result: SessionResult
  onRestart: () => void
  onExit: () => void
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

/**
 * Aggregates how long each gesture appeared across all events in a session,
 * weighted by the time between consecutive events. Gestures are filtered to
 * those that exceeded a meaningful intensity at any point.
 */
function aggregateGestureDurations(
  events: SessionResult['events'],
  totalDuration: number,
): Array<{ gesture: GestureId; ms: number }> {
  if (!events.length) return []
  const totals: Partial<Record<GestureId, number>> = {}

  for (let i = 0; i < events.length; i++) {
    const start = events[i].t_ms
    const end = i + 1 < events.length ? events[i + 1].t_ms : totalDuration
    const span = Math.max(0, end - start)
    for (const [g, score] of Object.entries(events[i].gestures) as Array<[GestureId, number]>) {
      if (typeof score === 'number' && score >= 0.25) {
        totals[g] = (totals[g] ?? 0) + span
      }
    }
  }

  return (Object.entries(totals) as Array<[GestureId, number]>)
    .map(([gesture, ms]) => ({ gesture, ms }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6)
}

export function SessionResultsView({ result, onRestart, onExit }: Props) {
  const dominant = result.dominant_emotion
  const dominantPct = result.dominant_percentage ?? 0

  // Show all detected emotions in descending percentage order. We do not
  // truncate here because a session typically has at most 5–7 emotions.
  const distribution = (Object.entries(result.emotion_distribution) as Array<[EmotionId, number]>)
    .sort((a, b) => b[1] - a[1])

  const topGestures = aggregateGestureDurations(result.events, result.duration_ms)

  return (
    <div className="flex flex-col gap-8 w-full max-w-md mx-auto px-4 py-8">
      {/* Header: success state and total duration. */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-xs uppercase tracking-widest text-accent">
          Sesión completada
        </span>
        <span className="text-sm text-text-muted">
          Duración: {formatMs(result.duration_ms)}
        </span>
      </div>

      {/* Dominant emotion ring with percentage at the center. The ring color
          and the percentage label both come from the dominant emotion so the
          visual reads as one unit. */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40">
          {dominant ? (
            <IntensityRing emotion={dominant} intensity={dominantPct / 100} size={160} />
          ) : (
            <div className="w-40 h-40 rounded-full border-4 border-border" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-text tabular-nums">
              {dominant ? `${dominantPct}%` : '—'}
            </span>
            {dominant && <EmotionLabel emotion={dominant} size="md" uppercase />}
          </div>
        </div>
      </div>

      {/* Distribution histogram: every emotion present with its time share. */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-text-muted">
          Distribución emocional
        </span>
        {distribution.length === 0 ? (
          <p className="text-sm text-text-muted">No se detectaron emociones.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {distribution.map(([emotion, pct]) => (
              <EmotionBar key={emotion} emotion={emotion} percentage={pct} />
            ))}
          </div>
        )}
      </div>

      {/* Aggregated gestures with the time each was active. */}
      {topGestures.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-text-muted">
            Gestos detectados
          </span>
          <ul className="flex flex-col gap-1.5">
            {topGestures.map(({ gesture, ms }) => (
              <li key={gesture} className="flex items-center justify-between text-sm text-text">
                <span>{GESTURE_LABELS[gesture]}</span>
                <span className="tabular-nums text-text-muted">{formatMs(ms)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary CTA: start another session. Secondary: leave the screen. */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white active:scale-[0.98] transition-all"
        >
          Nueva sesión
        </button>
        <button
          type="button"
          onClick={onExit}
          className="w-full py-3 rounded-xl text-sm font-medium text-text-muted hover:text-text transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
