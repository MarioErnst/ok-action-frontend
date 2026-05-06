import type { AnalysisResult, LiveDim, LiveSessionPhase, QARoundResult } from '../../../domain/LiveSession'
import type { QAQuestion } from '../../hooks/useLiveSession'
import { LiveFeedbackPanel } from '../molecules/LiveFeedbackPanel'
import { QuestionCard } from '../../../../precision/presentation/components/molecules/QuestionCard'

// Maximum session duration in seconds; progress bar fills to 100% at this point.
const MAX_SESSION_SECONDS = 300

const NOISE_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'Ruido bajo',
  medium: 'Ruido medio',
  high: 'Ruido alto',
}

const NOISE_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-danger',
}

interface Props {
  phase: LiveSessionPhase
  selectedDims: LiveDim[]
  latestAnalysis: AnalysisResult | null
  elapsedSeconds: number
  noiseLevel: 'low' | 'medium' | 'high'
  qaQuestion: QAQuestion | null
  qaLastResult: QARoundResult | null
  onEnd: () => void
  onAnswerDone: () => void
}

export function LiveRecordingScreen({
  phase,
  selectedDims,
  latestAnalysis,
  elapsedSeconds,
  noiseLevel,
  qaQuestion,
  qaLastResult,
  onEnd,
  onAnswerDone,
}: Props) {
  const progressPercent = Math.min((elapsedSeconds / MAX_SESSION_SECONDS) * 100, 100)
  const remainingSeconds = Math.max(0, MAX_SESSION_SECONDS - elapsedSeconds)
  const mins = Math.floor(remainingSeconds / 60)
  const secs = String(remainingSeconds % 60).padStart(2, '0')

  const hasPrecision = selectedDims.includes('precision')
  const isQaPhase = phase === 'qa_question' || phase === 'qa_evaluating' || phase === 'qa_result' || phase === 'qa_unintelligible' || phase === 'qa_complete'

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-md mx-auto min-h-screen pt-8 pb-28 lg:pb-6 animate-fade-in">

      {/* Session progress bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span className="font-bold uppercase tracking-widest text-accent">Sesión libre</span>
          <span className="font-mono">{mins}:{secs} restantes</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Noise level indicator */}
      <div className="flex items-center gap-2 self-end text-xs">
        <span className={`font-medium ${NOISE_COLOR[noiseLevel]}`}>{NOISE_LABEL[noiseLevel]}</span>
        <div className="flex gap-0.5">
          {(['low', 'medium', 'high'] as const).map((level, i) => (
            <div
              key={level}
              className={`w-1.5 rounded-sm transition-all duration-300 ${
                i === 0 ? 'h-2' : i === 1 ? 'h-3' : 'h-4'
              } ${
                noiseLevel === 'low' && i === 0 ? 'bg-success' :
                noiseLevel === 'medium' && i <= 1 ? 'bg-warning' :
                noiseLevel === 'high' ? 'bg-danger' :
                'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Q&A mode content */}
      {hasPrecision && isQaPhase ? (
        <div className="w-full flex flex-col gap-4">
          {/* Question card */}
          {qaQuestion && (phase === 'qa_question' || phase === 'qa_evaluating') && (
            <QuestionCard
              questionNumber={qaQuestion.number}
              totalQuestions={qaQuestion.total}
              text={qaQuestion.text}
              category="Precisión"
            />
          )}

          {/* Recording indicator */}
          {phase === 'qa_question' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative flex items-center justify-center w-16 h-16">
                <div className="absolute w-16 h-16 rounded-full bg-danger/20 animate-ping opacity-75" />
                <div className="w-10 h-10 rounded-full bg-danger shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
              </div>
              <p className="text-sm font-medium text-text-muted">Grabando respuesta...</p>
            </div>
          )}

          {/* Evaluating indicator */}
          {phase === 'qa_evaluating' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-16 h-16 rounded-full border-4 border-border border-t-accent animate-spin" />
              <p className="text-sm font-medium text-text-muted">Evaluando...</p>
            </div>
          )}

          {/* Round result */}
          {phase === 'qa_result' && qaLastResult && (
            <div className="w-full rounded-2xl border border-border/40 bg-surface/40 backdrop-blur-sm p-5 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Resultado</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Relevancia', value: qaLastResult.relevance },
                  { label: 'Directez', value: qaLastResult.directness },
                  { label: 'Concisión', value: qaLastResult.conciseness },
                  { label: 'General', value: qaLastResult.overall },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center bg-surface-alt rounded-xl p-3">
                    <span className="text-lg font-bold text-text">{value}</span>
                    <span className="text-xs text-text-muted">{label}</span>
                  </div>
                ))}
              </div>
              {qaLastResult.feedback && (
                <p className="text-sm text-text-muted italic">{qaLastResult.feedback}</p>
              )}
              <p className="text-xs text-text-muted text-center">La siguiente pregunta llegará en breve...</p>
            </div>
          )}

          {/* Unintelligible warning */}
          {phase === 'qa_unintelligible' && (
            <div className="w-full rounded-2xl border border-warning/40 bg-warning/5 p-5 text-center">
              <p className="text-sm font-medium text-warning">Audio no intelligible</p>
              <p className="text-xs text-text-muted mt-1">Continuamos con la siguiente pregunta...</p>
            </div>
          )}

          {/* Session complete */}
          {phase === 'qa_complete' && (
            <div className="w-full rounded-2xl border border-success/40 bg-success/5 p-5 text-center">
              <p className="text-sm font-bold text-success">Sesión de precisión completada</p>
              <p className="text-xs text-text-muted mt-1">Preparando resumen...</p>
            </div>
          )}

          {/* Answer done button */}
          {phase === 'qa_question' && (
            <button
              onClick={onAnswerDone}
              className="w-full py-4 rounded-2xl bg-accent/10 border border-accent/50 text-accent
                         font-semibold hover:bg-accent/20 active:scale-95 transition-all duration-200"
            >
              Terminé de responder
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Standard recording indicator */}
          <div className="flex flex-col items-center gap-3 py-2">
            {phase === 'connecting' ? (
              <div className="w-16 h-16 rounded-full border-4 border-border border-t-accent animate-spin" />
            ) : (
              <div className="relative flex items-center justify-center w-16 h-16">
                <div className="absolute w-16 h-16 rounded-full bg-danger/20 animate-ping opacity-75" />
                <div className="w-10 h-10 rounded-full bg-danger shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
              </div>
            )}
            <p className="text-sm font-medium text-text-muted">
              {phase === 'connecting' ? 'Conectando...' : 'Escuchando...'}
            </p>
          </div>

          {/* Real-time feedback panel */}
          {latestAnalysis ? (
            <LiveFeedbackPanel
              analysis={latestAnalysis}
              selectedDims={selectedDims}
              elapsedSeconds={elapsedSeconds}
            />
          ) : (
            <div className="w-full rounded-2xl border border-border/40 bg-surface/40 backdrop-blur-sm p-6 text-center">
              <p className="text-sm text-text-muted">
                El análisis aparecerá aquí mientras hablas.
              </p>
            </div>
          )}
        </>
      )}

      {/* End session button */}
      <button
        onClick={onEnd}
        className="w-full py-4 rounded-2xl border border-border/60 bg-surface-alt/50 text-text-muted
                   font-medium hover:border-danger/50 hover:text-danger active:scale-95 transition-all duration-200"
      >
        Terminar sesión
      </button>

    </div>
  )
}
