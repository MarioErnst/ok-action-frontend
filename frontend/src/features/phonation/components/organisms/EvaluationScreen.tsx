import { useEffect, useRef } from 'react';
import type { PhonationFrame } from '../../types';
import useEvaluationSession from '../../hooks/useEvaluationSession';
import { ExercisePrompt } from '../molecules/ExercisePrompt';
import { LiveFeedback } from '../molecules/LiveFeedback';
import { SessionProgress } from '../molecules/SessionProgress';

interface EvaluationScreenProps {
  onFinish: (results: Map<string, PhonationFrame[]>) => void;
}

export const EvaluationScreen = ({ onFinish }: EvaluationScreenProps) => {
  const session = useEvaluationSession();
  const hasNotifiedFinishRef = useRef(false);

  useEffect(() => {
    if (session.phase === 'finished' && !hasNotifiedFinishRef.current) {
      hasNotifiedFinishRef.current = true;
      onFinish(session.recordedResults);
    }

    if (session.phase !== 'finished') {
      hasNotifiedFinishRef.current = false;
    }
  }, [session.phase, session.recordedResults, onFinish]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 p-6">
      {session.phase === 'idle' && (
        <>
          <button
            type="button"
            className="rounded-xl bg-accent px-8 py-3 font-bold text-bg"
            onClick={() => {
              void session.startSession();
            }}
          >
            Iniciar evaluacion
          </button>
          <p className="text-text-muted">
            Se realizaran {session.totalExercises} ejercicios vocales
          </p>
        </>
      )}

      {(session.phase === 'countdown' || session.phase === 'recording') && session.currentExercise && (
        <>
          <SessionProgress
            currentIndex={session.currentIndex}
            totalExercises={session.totalExercises}
            phase={session.phase}
          />

          <ExercisePrompt
            instruction={session.currentExercise.instruction}
            countdown={session.countdown}
            isCountdown={session.phase === 'countdown'}
            elapsedMs={session.elapsedMs}
            durationMs={session.currentExercise.durationMs}
            isRecording={session.phase === 'recording'}
          />

          <LiveFeedback
            hz={session.hz}
            db={session.db}
            targetHzRange={session.currentExercise.targetHzRange}
            isRecording={session.phase === 'recording'}
          />
        </>
      )}

      {session.phase === 'finished' && (
        <>
          <SessionProgress
            currentIndex={session.currentIndex}
            totalExercises={session.totalExercises}
            phase="finished"
          />
          <p className="text-text-muted">Procesando resultados...</p>
        </>
      )}

      {session.isCalibrating && (
        <p className="text-center text-accent">Calibrando microfono, mantenga silencio...</p>
      )}
    </div>
  );
};
