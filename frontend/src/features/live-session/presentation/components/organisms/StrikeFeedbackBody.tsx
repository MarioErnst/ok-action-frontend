import { useMemo, useState } from 'react'
import type { ComposedEvaluation, LiveModule } from '../../../domain/LiveSession'
import type { StrikeEvent, StrikeKind } from '../../../domain/StrikeEvent'
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

// Tabs are keyed by the kinds that can produce a strike, plus a
// virtual "summary" tab for the overall scores card. facial_expression
// has its own tab even though it never produces strikes (its data
// belongs in the breakdown by emotion).
type FeedbackTab =
  | 'summary'
  | 'muletilla'
  | 'accentuation'
  | 'pronunciation'
  | 'facial_expression'

const STRIKE_TAB_LABELS: Record<Exclude<FeedbackTab, 'summary' | 'facial_expression'>, string> = {
  muletilla: 'Muletillas',
  accentuation: 'Acentuación',
  pronunciation: 'Pronunciación',
}

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
  const eventsByKind = useMemo(() => {
    const map: Record<StrikeKind, StrikeEvent[]> = {
      muletilla: [],
      accentuation: [],
      pronunciation: [],
    }
    for (const ev of events) map[ev.kind].push(ev)
    return map
  }, [events])

  const tabs = useMemo(() => {
    const out: Array<{ id: FeedbackTab; label: string; count?: number }> = [
      { id: 'summary', label: 'Resumen' },
    ]
    if (selectedModules.includes('muletillas')) {
      out.push({
        id: 'muletilla',
        label: STRIKE_TAB_LABELS.muletilla,
        count: eventsByKind.muletilla.length,
      })
    }
    if (selectedModules.includes('accentuation')) {
      out.push({
        id: 'accentuation',
        label: STRIKE_TAB_LABELS.accentuation,
        count: eventsByKind.accentuation.length,
      })
    }
    if (selectedModules.includes('pronunciation')) {
      out.push({
        id: 'pronunciation',
        label: STRIKE_TAB_LABELS.pronunciation,
        count: eventsByKind.pronunciation.length,
      })
    }
    if (selectedModules.includes('facial_expression')) {
      out.push({ id: 'facial_expression', label: LIVE_MODULE_LABELS.facial_expression })
    }
    return out
  }, [selectedModules, eventsByKind])

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
          <MuletillasPanel events={eventsByKind.muletilla} />
        )}
        {activeTab === 'accentuation' && (
          <WordErrorsPanel kind="accentuation" events={eventsByKind.accentuation} />
        )}
        {activeTab === 'pronunciation' && (
          <WordErrorsPanel kind="pronunciation" events={eventsByKind.pronunciation} />
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

// Renders each unique word the user got wrong in accentuation or
// pronunciation. The strike counter deduplicates by normalised word, so
// each row here corresponds to one distinct mistake reported by Gemini
// (not one per frame). The actionable fields come from the per-word error
// items in the frame Gemini response since the grounding hotfix.
function WordErrorsPanel({
  kind,
  events,
}: {
  kind: 'accentuation' | 'pronunciation'
  events: StrikeEvent[]
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No detectamos errores de {STRIKE_TAB_LABELS[kind].toLowerCase()} en la sesión.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {events.map((ev, i) => (
        <li
          key={`${kind}-${ev.word ?? ev.frameIndex}-${i}`}
          className="flex flex-col gap-1 bg-surface-alt rounded-xl px-3 py-2 text-sm"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-text">
              {ev.word ?? 'palabra desconocida'}
              {kind === 'pronunciation' && ev.phoneme && (
                <span className="text-text-muted font-normal">
                  {' '}
                  · fonema /{ev.phoneme}/
                </span>
              )}
              {kind === 'accentuation' && ev.expectedStress && (
                <span className="text-text-muted font-normal">
                  {' '}
                  · esperado {ev.expectedStress}
                </span>
              )}
            </span>
            <span className="text-xs text-text-muted whitespace-nowrap">
              {formatRelative(ev.timestampMs)}
            </span>
          </div>
          {ev.actualIssue && (
            <span className="text-xs text-text-muted">{ev.actualIssue}</span>
          )}
          {ev.suggestion && (
            <span className="text-xs text-text">{ev.suggestion}</span>
          )}
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
