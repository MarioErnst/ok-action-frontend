import type { RefObject } from 'react'
import { CameraView } from '../molecules/CameraView'
import { ExpressionPanel } from '../molecules/ExpressionPanel'
import { QuestionCard } from '../molecules/QuestionCard'
import { VoiceIndicator } from '../molecules/VoiceIndicator'
import type { FacialExpressionQuestion, LiveBlendshapes } from '../../../domain/FacialExpression'

type RecordingSessionProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  isCameraActive: boolean
  blendshapes: LiveBlendshapes | null
  isListening: boolean
  question: FacialExpressionQuestion
  questionNumber: number
  totalQuestions: number
  phase: 'question' | 'recording'
  onStartRecording: () => void
  onNext: () => void
}

// NEUTRAL_BLENDSHAPES provides a zero baseline when blendshapes are not yet
// available, avoiding a null check inside ExpressionPanel which requires LiveBlendshapes.
const NEUTRAL_BLENDSHAPES: LiveBlendshapes = { pucker: 0, brow_down: 0, lips_down: 0 }

export function RecordingSession({
  videoRef,
  isCameraActive,
  blendshapes,
  isListening,
  question,
  questionNumber,
  totalQuestions,
  phase,
  onStartRecording,
  onNext,
}: RecordingSessionProps) {
  const isRecording = phase === 'recording'
  // Zero-based index expected by QuestionCard
  const questionIndex = questionNumber - 1
  const isLastQuestion = questionNumber === totalQuestions
  const nextLabel = isLastQuestion ? 'Finalizar' : 'Siguiente pregunta'

  return (
    // Portrait: stacked vertically. Landscape (lg): side-by-side.
    <div className="flex flex-col lg:flex-row w-full min-h-0 gap-4">
      {/* Camera panel — left in landscape, full width in portrait */}
      <div className="w-full lg:w-1/2 flex-shrink-0">
        <CameraView videoRef={videoRef} isActive={isCameraActive} />
      </div>

      {/* Content panel — scrollable so long questions never clip on small screens */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto px-4 lg:px-0">
        <QuestionCard
          text={question.text}
          index={questionIndex}
          total={totalQuestions}
          isRecording={isRecording}
        />

        {isRecording && (
          <>
            {/* Live expression feedback is only shown during active recording */}
            <ExpressionPanel blendshapes={blendshapes ?? NEUTRAL_BLENDSHAPES} />
            <VoiceIndicator isSpeaking={isListening} />
          </>
        )}

        {!isRecording && (
          <button
            type="button"
            onClick={onStartRecording}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white active:bg-accent/80 transition-colors"
          >
            Iniciar grabación
          </button>
        )}

        {isRecording && (
          <button
            type="button"
            onClick={onNext}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white active:bg-accent/80 transition-colors mt-auto"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  )
}
