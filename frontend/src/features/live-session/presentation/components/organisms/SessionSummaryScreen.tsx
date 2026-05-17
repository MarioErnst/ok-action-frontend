import { HighlightedTranscript } from '../../../../../shared/ui/atoms/HighlightedTranscript'
import { LIVE_MODULE_LABELS } from '../../../domain/liveDimLabels'
import type {
  ComposedEvaluation,
  FacialEmotionName,
  FacialExpressionSection,
  LiveModule,
  LoudnessSection,
  MuletillaPosition,
  MuletillasSection,
  PhonationSection,
} from '../../../domain/LiveSession'

interface Props {
  evaluation: ComposedEvaluation
  selectedModules: LiveModule[]
  liveScore: number | null
  onNewSession: () => void
  onGoToDashboard: () => void
}

const SCORE_TONE = (score: number): string => {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-danger'
}

interface SubScore {
  label: string
  value: number
}

// Final phase of a live session. Renders one card per evaluated module
// with its main score, sub-scores, feedback and (for muletillas) the
// list of detected fillers. Falls back to a clear warning when the
// audio came back unintelligible — we do not pretend to show a score
// in that case.
export function SessionSummaryScreen({
  evaluation,
  selectedModules,
  liveScore,
  onNewSession,
  onGoToDashboard,
}: Props) {
  if (!evaluation.audio_intelligible) {
    return (
      <UnintelligibleSummary
        onNewSession={onNewSession}
        onGoToDashboard={onGoToDashboard}
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-2xl mx-auto pt-8 pb-28 lg:pb-12 animate-fade-in">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Sesión finalizada
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
          Tu desempeño en esta sesión
        </h1>
        {liveScore !== null && (
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-5xl font-extrabold ${SCORE_TONE(liveScore)}`}>
              {liveScore}
            </span>
            <span className="text-sm font-medium text-text-muted">/ 100</span>
          </div>
        )}
        <p className="text-xs text-text-muted">
          Promedio de los módulos evaluados.
        </p>
      </div>

      {evaluation.transcript && (
        <TranscriptCard
          transcript={evaluation.transcript}
          positions={evaluation.muletillas?.muletillas_positions ?? []}
        />
      )}

      <div className="flex flex-col gap-4 w-full">
        {selectedModules.map((module) => (
          <ModuleResultCard
            key={module}
            module={module}
            evaluation={evaluation}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
        <button
          onClick={onNewSession}
          type="button"
          className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-hover py-4 font-extrabold
                     text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95
                     transition-all duration-300 min-h-[44px]"
        >
          Nueva sesión
        </button>
        <button
          onClick={onGoToDashboard}
          type="button"
          className="flex-1 rounded-2xl border border-border/60 bg-surface-alt/50 text-text font-medium py-4
                     hover:border-border active:scale-95 transition-all duration-200 min-h-[44px]"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}

function UnintelligibleSummary({
  onNewSession,
  onGoToDashboard,
}: Pick<Props, 'onNewSession' | 'onGoToDashboard'>) {
  return (
    <div className="flex flex-col items-center gap-6 p-6 w-full max-w-md mx-auto min-h-[100dvh] justify-center text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full border-2 border-warning/40 bg-warning/10 flex items-center justify-center text-warning text-2xl font-bold">
        !
      </div>
      <h1 className="text-2xl font-extrabold text-text">Audio no inteligible</h1>
      <p className="text-sm text-text-muted leading-relaxed">
        No pudimos analizar este audio. Probá grabar de nuevo en un lugar más
        silencioso y hablando hacia el micrófono.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onNewSession}
          type="button"
          className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-hover py-4 font-extrabold
                     text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95
                     transition-all duration-300 min-h-[44px]"
        >
          Intentar de nuevo
        </button>
        <button
          onClick={onGoToDashboard}
          type="button"
          className="flex-1 rounded-2xl border border-border/60 bg-surface-alt/50 text-text font-medium py-4
                     hover:border-border active:scale-95 transition-all duration-200 min-h-[44px]"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}

interface ModuleResultCardProps {
  module: LiveModule
  evaluation: ComposedEvaluation
}

function ModuleResultCard({ module, evaluation }: ModuleResultCardProps) {
  const section = evaluation[module]
  if (!section) {
    return null
  }

  const { mainScore, subScores, feedback, extra } = describeSection(module, section)

  return (
    <div className="rounded-2xl border border-border/40 bg-surface/60 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-text">{LIVE_MODULE_LABELS[module]}</h2>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-extrabold ${SCORE_TONE(mainScore)}`}>
            {mainScore}
          </span>
          <span className="text-xs text-text-muted">/ 100</span>
        </div>
      </div>

      {subScores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {subScores.map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center bg-surface-alt rounded-xl p-3"
            >
              <span className={`text-xl font-bold ${SCORE_TONE(value)}`}>{value}</span>
              <span className="text-xs text-text-muted text-center">{label}</span>
            </div>
          ))}
        </div>
      )}

      {feedback && (
        <p className="text-sm text-text leading-relaxed">{feedback}</p>
      )}

      {extra}
    </div>
  )
}

interface SectionDescription {
  mainScore: number
  subScores: SubScore[]
  feedback: string
  extra: React.ReactNode
}

const FACIAL_EMOTION_LABELS: Record<FacialEmotionName, string> = {
  happy: 'Feliz',
  sad: 'Tristeza',
  angry: 'Enojo',
  surprised: 'Sorpresa',
  fearful: 'Miedo',
  disgusted: 'Disgusto',
  neutral: 'Neutral',
}

function describeSection(
  module: LiveModule,
  section:
    | MuletillasSection
    | PhonationSection
    | LoudnessSection
    | FacialExpressionSection,
): SectionDescription {
  if (module === 'muletillas') {
    const s = section as MuletillasSection
    return {
      mainScore: s.fluency_score,
      subScores: [
        { label: 'Fluidez', value: s.fluency_score },
        { label: 'Detectadas', value: s.total_muletillas },
      ],
      feedback: s.feedback,
      extra:
        s.detected.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Muletillas detectadas
            </p>
            <ul className="flex flex-col gap-1.5">
              {s.detected.map((item) => (
                <li
                  key={`${item.word}-${item.severity}`}
                  className="flex items-center justify-between gap-3 text-sm bg-surface-alt rounded-xl px-3 py-2"
                >
                  <span className="font-semibold text-text">"{item.word}"</span>
                  <span className="text-xs text-text-muted">
                    {item.count}× · {item.severity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
    }
  }

  if (module === 'phonation') {
    const s = section as PhonationSection
    return {
      mainScore: s.stability_score,
      subScores: [
        { label: 'Estabilidad', value: s.stability_score },
        { label: 'Hz promedio', value: Math.round(s.avg_hz) },
        { label: 'Saltos', value: s.breaks_count },
      ],
      feedback:
        s.breaks_count === 0
          ? 'No detectamos saltos bruscos de frecuencia: tu voz se mantuvo estable.'
          : `Detectamos ${s.breaks_count} salto${s.breaks_count === 1 ? '' : 's'} de frecuencia durante la sesión.`,
      extra: null,
    }
  }

  if (module === 'loudness') {
    const s = section as LoudnessSection
    return {
      mainScore: s.optimal_pct,
      subScores: [
        { label: 'Óptimo', value: s.optimal_pct },
        { label: 'Bajo', value: s.low_pct },
        { label: 'Alto', value: s.high_pct },
        { label: 'Clipping', value: s.clipping_pct },
      ],
      feedback:
        s.clipping_pct > 0
          ? `Te saturaste el ${s.clipping_pct}% de la sesión. Probá alejarte un poco del micrófono o bajar el volumen de tu voz.`
          : `Estuviste en banda óptima el ${s.optimal_pct}% del tiempo.`,
      extra: null,
    }
  }

  const s = section as FacialExpressionSection
  const breakdownSource: Array<{ emotion: FacialEmotionName; pct: number }> = [
    { emotion: 'happy' as FacialEmotionName, pct: s.happy_pct },
    { emotion: 'sad' as FacialEmotionName, pct: s.sad_pct },
    { emotion: 'angry' as FacialEmotionName, pct: s.angry_pct },
    { emotion: 'surprised' as FacialEmotionName, pct: s.surprised_pct },
    { emotion: 'fearful' as FacialEmotionName, pct: s.fearful_pct },
    { emotion: 'disgusted' as FacialEmotionName, pct: s.disgusted_pct },
    { emotion: 'neutral' as FacialEmotionName, pct: s.neutral_pct },
  ]
  const breakdown = breakdownSource
    .filter((row) => row.pct > 0)
    .sort((a, b) => b.pct - a.pct)

  return {
    mainScore: s.expressiveness_score,
    subScores: [
      { label: 'Expresividad', value: s.expressiveness_score },
      { label: FACIAL_EMOTION_LABELS[s.top_emotion], value: 100 },
    ],
    feedback: `Tu emoción predominante fue ${FACIAL_EMOTION_LABELS[s.top_emotion].toLowerCase()}.`,
    extra:
      breakdown.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            Distribución de emociones
          </p>
          <ul className="grid grid-cols-2 gap-1.5 text-sm">
            {breakdown.map(({ emotion, pct }) => (
              <li
                key={emotion}
                className="flex items-center justify-between gap-3 bg-surface-alt rounded-xl px-3 py-2"
              >
                <span className="text-text">{FACIAL_EMOTION_LABELS[emotion]}</span>
                <span className="text-xs text-text-muted">{pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null,
  }
}

interface TranscriptCardProps {
  transcript: string
  positions: MuletillaPosition[]
}

// Live composed responses (since the grounding hotfix) return the literal
// transcript at the root. We surface it as a dedicated card above the
// per-module cards so the user can compare against the actual recording and
// see filler-word occurrences highlighted in place.
function TranscriptCard({ transcript, positions }: TranscriptCardProps) {
  // Map snake_case grounded positions to the shared atom's neutral shape.
  // Filtering out occurrences whose substring does not match transcript is
  // done inside HighlightedTranscript when out-of-bounds, so we only handle
  // the field name translation here.
  const ranges = positions.map((p) => ({
    startChar: p.start_char,
    endChar: p.end_char,
  }))

  return (
    <div className="rounded-2xl border border-border/40 bg-surface/60 p-5 w-full">
      <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
        Transcripción
      </p>
      <HighlightedTranscript
        transcript={transcript}
        positions={ranges}
        className="text-sm text-text leading-relaxed"
      />
    </div>
  )
}

