import { useEffect, useRef } from 'react';
import type { SessionResult, VoiceExercise } from '../../../types';
import useEvaluationSession from '../../hooks/useEvaluationSession';
import { ExercisePrompt } from '../molecules/ExercisePrompt';
import { LiveFeedback } from '../molecules/LiveFeedback';
import { SessionProgress } from '../molecules/SessionProgress';

interface EvaluationScreenProps {
  // Receives SessionResult so the page can pass it to ResultsScreen without coupling.
  onFinish: (result: SessionResult | null) => void;
  exercises?: VoiceExercise[];
}

export const EvaluationScreen = ({ onFinish, exercises }: EvaluationScreenProps) => {
  const session = useEvaluationSession(exercises);
  const hasNotifiedFinishRef = useRef(false);

  useEffect(() => {
    if (session.phase === 'finished' && !hasNotifiedFinishRef.current) {
      hasNotifiedFinishRef.current = true;
      onFinish(session.diagnosisResult);
    }

    if (session.phase !== 'finished') {
      hasNotifiedFinishRef.current = false;
    }
  }, [session.phase, session.diagnosisResult, onFinish]);

  // Start the session automatically when the screen first enters 'idle'
  // to preserve the direct flow the user expects
  useEffect(() => {
    if (session.phase === 'idle') {
      void session.startSession();
    }
  }, [session.phase, session.startSession]);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-bg">
      {/* Header (same style as the menu) */}
      <div className="bg-gradient-to-b from-accent/10 to-transparent px-4 pt-8 pb-4">
        <div className="mx-auto w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-text">Evaluación de Voz</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
            
          {session.phase === 'idle' && (
             <div className="rounded-2xl border-2 border-border/50 bg-surface p-6 text-center shadow-sm">
                <p className="text-text">Preparando evaluación...</p>
             </div>
          )}

          {(session.phase === 'countdown' || session.phase === 'recording') && session.currentExercise && (
             <div className="flex flex-col gap-6">
               <div className="rounded-2xl border-2 border-border/50 bg-surface p-5 shadow-sm">
                 <SessionProgress
                    currentIndex={session.currentIndex}
                    totalExercises={session.totalExercises}
                    phase={session.phase}
                 />
               </div>

               <div className="rounded-3xl border-2 border-accent/30 bg-gradient-to-b from-accent/10 to-surface p-6 shadow-md">
                 <ExercisePrompt
                    instruction={session.currentExercise.instruction}
                    countdown={session.countdown}
                    isCountdown={session.phase === 'countdown'}
                    elapsedMs={session.elapsedMs}
                    durationMs={session.currentExercise.durationMs}
                    isRecording={session.phase === 'recording'}
                 />
               </div>

               <div className="rounded-2xl border-2 border-border/50 bg-surface p-5 shadow-sm">
                  <LiveFeedback
                    hz={session.hz}
                    db={session.db}
                    targetHzRange={session.currentExercise.targetHzRange}
                    isRecording={session.phase === 'recording'}
                  />
               </div>
             </div>
          )}

          {session.phase === 'finished' && (
             <div className="flex flex-col gap-6">
                 <div className="rounded-2xl border-2 border-border/50 bg-surface p-5 shadow-sm">
                     <SessionProgress
                        currentIndex={session.currentIndex}
                        totalExercises={session.totalExercises}
                        phase="finished"
                     />
                 </div>
                 
                 <div className="rounded-2xl border-2 border-success/30 bg-gradient-to-b from-success/10 to-surface p-8 text-center shadow-md">
                    <p className="text-lg font-medium text-text">Evaluación completada</p>
                    <p className="mt-2 text-sm text-text-muted">Procesando resultados...</p>
                 </div>
             </div>
          )}

          {session.isCalibrating && (
             <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md">
                 <div className="flex items-center justify-center gap-3 rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 p-4 shadow-lg backdrop-blur-md">
                    <p className="text-sm font-medium text-amber-500">Calibrando micrófono, mantén silencio...</p>
                 </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
