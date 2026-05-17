import { useMemo, useState } from 'react'
import type { ComposedEvaluation, LiveModule } from '../../../domain/LiveSession'
import type { StrikeEvent } from '../../../domain/StrikeEvent'
import { LIVE_MODULE_LABELS } from '../../../domain/liveDimLabels'
import { ModuleTabPill } from '../molecules/ModuleTabPill'
import { FrameAudioPlayer } from './FrameAudioPlayer'

interface StrikeFeedbackBodyProps {
  events: StrikeEvent[]
  evaluation: ComposedEvaluation | null
  liveScore: number | null
  selectedModules: LiveModule[]
  audioUrl: string | null
  estimatedDurationMs: number
  stopReason: 'auto_stop_strikes' | 'auto_stop_emotion'
  emotionLabel?: string
}

// Tabs available on the post-stop feedback panel. The strike-driven
// detail tab is only `muletilla` (pron/acc moved to composed-eval at
// session end and surface in `summary`). `facial_expression` keeps its
// own tab for the per-emotion breakdown when the module was selected.
type FeedbackTab = 'summary' | 'muletilla' | 'facial_expression'

const formatRelative = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Rich post-stop feedback. Renders the live score, a tabbed list of
// detected events grouped by module, and an audio player anchored
// with markers when the recording blob is available. The page above
// owns the action buttons (Reintentar / Dashboard / Cerrar) and
// decides which to render based on stopReason and platform context.
export const StrikeFeedbackBody = ({
  events,
  evaluation,
  liveScore,
  selectedModules,
  audioUrl,
  estimatedDurationMs,
  stopReason,
  emotionLabel,
}: StrikeFeedbackBodyProps) => {
  const muletillaEvents = useMemo(
    () => events.filter((ev) => ev.kind === 'muletilla'),
    [events],
  )

  const tabs = useMemo(() => {
    const out: Array<{ id: FeedbackTab; label: string; count?: number }> = [
      { id: 'summary', label: 'Resumen' },
    ]
    if (selectedModules.includes('muletillas')) {
      out.push({
        id: 'muletilla',
        label: 'Muletillas',
        count: muletillaEvents.length,
      })
    }
    if (selectedModules.includes('facial_expression')) {
      out.push({ id: 'facial_expression', label: LIVE_MODULE_LABELS.facial_expression })
    }
    return out
  }, [selectedModules, muletillaEvents])

  const [activeTab, setActiveTab] = useState<FeedbackTab>('summary')

  const reasonHeadline =
    stopReason === 'auto_stop_strikes'
      ? 'Detuvimos la sesión por errores acumulados'
      : `Detuvimos la sesión por una emoción sostenida${
          emotionLabel ? ` (${emotionLabel})` : ''
        }`

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <p className="text-xs font-bold uppercase tracking-widest text-warning">
          Sesión detenida
        </p>
        <h2 className="text-xl sm:text-2xl font-extrabold text-text">
          {reasonHeadline}
        </h2>
        {liveScore !== null && (
          <p className="text-sm text-text-muted">
            Puntaje agregado sobre lo que sí grabaste:{' '}
            <span className="text-text font-semibold">{liveScore}/100</span>
          </p>
        )}
      </div>

      {audioUrl && (
        <FrameAudioPlayer
          audioUrl={audioUrl}
          estimatedDurationMs={estimatedDurationMs}
          events={events}
        />
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
        {tabs.map((t) => (
          <ModuleTabPill
            key={t.id}
            label={t.label}
            active={t.id === activeTab}
            count={t.count}
            onClick={() => setActiveTab(t.id)}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border/40 bg-surface/60 p-5">
        {activeTab === 'summary' && (
          <SummaryPanel evaluation={evaluation} selectedModules={selectedModules} />
        )}
        {activeTab === 'muletilla' && (
          <MuletillasPanel events={muletillaEvents} />
        )}
        {activeTab === 'facial_expression' && (
          <FacialPanel evaluation={evaluation} />
        )}
      </div>
    </div>
  )
}

function SummaryPanel({
  evaluation,
  selectedModules,
}: {
  evaluation: ComposedEvaluation | null
  selectedModules: LiveModule[]
}) {
  if (!evaluation) {
    return (
      <p className="text-sm text-text-muted">
        No alcanzamos a registrar evaluación final. Probá repetir la sesión.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {selectedModules.map((module) => (
        <li
          key={module}
          className="flex items-center justify-between bg-surface-alt rounded-xl px-3 py-2"
        >
          <span className="text-text">{LIVE_MODULE_LABELS[module]}</span>
          <span className="text-text-muted text-xs">
            {evaluation[module] ? 'Evaluado' : 'Sin datos'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function MuletillasPanel({ events }: { events: StrikeEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-text-muted">No detectamos muletillas durante la sesión.</p>
  }
  return (
    <ul className="flex flex-col gap-2">
      {events.map((ev, i) => (
        <li
          key={`${ev.word}-${ev.timestampMs}-${i}`}
          className="flex items-center justify-between bg-surface-alt rounded-xl px-3 py-2 text-sm"
        >
          <span className="font-semibold text-text">"{ev.word ?? 'muletilla'}"</span>
          <span className="text-xs text-text-muted">
            {formatRelative(ev.timestampMs)} · {ev.severity ?? 'low'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function FacialPanel({ evaluation }: { evaluation: ComposedEvaluation | null }) {
  const facial = evaluation?.facial_expression
  if (!facial) {
    return (
      <p className="text-sm text-text-muted">
        No se registraron emociones suficientes para un desglose facial.
      </p>
    )
  }
  const rows = [
    { label: 'Feliz', pct: facial.happy_pct },
    { label: 'Tristeza', pct: facial.sad_pct },
    { label: 'Enojo', pct: facial.angry_pct },
    { label: 'Sorpresa', pct: facial.surprised_pct },
    { label: 'Miedo', pct: facial.fearful_pct },
    { label: 'Disgusto', pct: facial.disgusted_pct },
    { label: 'Neutral', pct: facial.neutral_pct },
  ]
    .filter((row) => row.pct > 0)
    .sort((a, b) => b.pct - a.pct)

  return (
    <ul className="grid grid-cols-2 gap-2 text-sm">
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex items-center justify-between bg-surface-alt rounded-xl px-3 py-2"
        >
          <span className="text-text">{row.label}</span>
          <span className="text-xs text-text-muted">{row.pct}%</span>
        </li>
      ))}
    </ul>
  )
}
