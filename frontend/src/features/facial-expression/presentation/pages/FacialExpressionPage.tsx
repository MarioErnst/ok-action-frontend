import { useEffect } from 'react'
import { useExpressionSession } from '../hooks/useExpressionSession'
import { useFaceDetector } from '../hooks/useFaceDetector'
import { useVoiceActivity } from '../hooks/useVoiceActivity'
import { CalibrationScreen } from '../components/organisms/CalibrationScreen'
import { RecordingSession } from '../components/organisms/RecordingSession'
import { SessionResults } from '../components/organisms/SessionResults'

export function FacialExpressionPage() {
  const {
    phase,
    currentQuestion,
    questionIndex,
    totalQuestions,
    calibrationProgress,
    result,
    error,
    onCalibrationFrame,
    onRecordingFrame,
    startCalibration,
    startQuestion,
    finishQuestion,
    reset,
  } = useExpressionSession()

  const {
    isLoaded,
    isCameraActive,
    blendshapes,
    videoRef,
    startCamera,
    error: cameraError,
  } = useFaceDetector()

  const { isSpeaking, startListening, stopListening } = useVoiceActivity()

  // Start the camera once the face detection model finishes loading.
  // isLoaded changes at most once per mount so this effect runs once.
  useEffect(() => {
    if (isLoaded) {
      startCamera()
    }
  }, [isLoaded, startCamera])

  // Transition from loading to calibration phase once the camera is active
  // and the session is still in the initial loading state.
  useEffect(() => {
    if (isCameraActive && phase === 'loading') {
      // Phase is set by useExpressionSession; we signal readiness here
      // so CalibrationScreen can show the start button.
      startCalibration()
    }
  }, [isCameraActive, phase, startCalibration])

  // Forward each blendshape frame to the correct session callback based on phase.
  // blendshapes updates at 15fps from useFaceDetector's detection loop.
  useEffect(() => {
    if (phase === 'calibration') {
      onCalibrationFrame(blendshapes)
    } else if (phase === 'recording') {
      onRecordingFrame(blendshapes)
    }
  }, [blendshapes, phase, onCalibrationFrame, onRecordingFrame])

  // Manage voice activity detector alongside question recording.
  useEffect(() => {
    if (phase === 'recording') {
      startListening()
    } else {
      stopListening()
    }
  }, [phase, startListening, stopListening])

  return (
    <div className="flex flex-col items-center justify-start w-full h-[100dvh] overflow-y-auto bg-background px-4 pt-6 pb-safe">
      {(phase === 'loading' || phase === 'calibration') && (
        <CalibrationScreen
          videoRef={videoRef}
          isCameraActive={isCameraActive}
          calibrationProgress={calibrationProgress}
          phase={phase}
          onStart={startCalibration}
        />
      )}

      {(phase === 'question' || phase === 'recording') && (
        <RecordingSession
          videoRef={videoRef}
          isCameraActive={isCameraActive}
          blendshapes={blendshapes}
          isListening={isSpeaking}
          question={currentQuestion}
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          phase={phase}
          onStartRecording={startQuestion}
          onNext={finishQuestion}
        />
      )}

      {phase === 'submitting' && (
        <div className="flex flex-col items-center justify-center gap-4 h-64">
          {/* Spinner shown while the session payload is being saved to the backend */}
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-text-muted">Guardando resultados...</p>
        </div>
      )}

      {phase === 'results' && result && (
        <SessionResults result={result} onRestart={reset} />
      )}

      {phase === 'error' && (
        <div className="flex flex-col items-center gap-4 max-w-xs w-full py-8">
          <p className="text-sm text-danger text-center">
            {cameraError ?? error ?? 'Ocurrió un error inesperado.'}
          </p>
          <button
            type="button"
            onClick={reset}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-surface-alt text-text active:bg-surface transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
