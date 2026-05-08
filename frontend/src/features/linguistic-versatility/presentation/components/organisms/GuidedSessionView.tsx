import type {
  EvaluateRoundResponse,
  GuidedStatus,
  VersatilityQuestion,
} from '../../../domain/LinguisticVersatility'
import { QuestionCard } from '../molecules/QuestionCard'
import { RecordButton } from '../molecules/RecordButton'
import { FeedbackPanel } from '../molecules/FeedbackPanel'

type Props = {
  status: GuidedStatus
  question: VersatilityQuestion
  index: number
  total: number
  isLastQuestion: boolean
  lastResult: EvaluateRoundResponse | null
  onStartRecording: () => void
  onStopAndUpload: () => void
  onNext: () => void
}

/**
 * The guided-mode body shown for every question.
 *
 * Layout: question on top, record control beneath, feedback panel below
 * (only after the round was uploaded). The "siguiente" / "finalizar" button
 * appears only after a successful upload to prevent the user from skipping
 * the recording step entirely.
 */
export function GuidedSessionView({
  status,
  question,
  index,
  total,
  isLastQuestion,
  lastResult,
  onStartRecording,
  onStopAndUpload,
  onNext,
}: Props) {
  // Map the page status into the RecordButton's three-state contract.
  const recordState =
    status === 'recording' ? 'recording' : status === 'uploading' ? 'uploading' : 'idle'

  // Show the result panel only when there is one for the current question.
  // After pressing "Siguiente" the parent clears `lastResult` to avoid leaking
  // the previous answer into the next question's view.
  const showResult = lastResult != null && status === 'review'

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-4 pt-4 pb-safe gap-4 overflow-y-auto">
      <QuestionCard text={question.text} index={index} total={total} />

      {showResult && (
        <FeedbackPanel
          versatilityScore={lastResult.versatility_score}
          vocabularyRichness={lastResult.vocabulary_richness}
          feedback={lastResult.feedback}
          audioIntelligible={lastResult.audio_intelligible}
        />
      )}

      <div className="mt-auto flex flex-col gap-3">
        {!showResult && (
          <RecordButton
            state={recordState}
            onStart={onStartRecording}
            onStop={onStopAndUpload}
          />
        )}
        {showResult && (
          <button
            type="button"
            onClick={onNext}
            className="w-full py-4 rounded-2xl text-base font-semibold bg-accent text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all"
          >
            {isLastQuestion ? 'Finalizar y ver resultados' : 'Siguiente pregunta'}
          </button>
        )}
      </div>
    </div>
  )
}
