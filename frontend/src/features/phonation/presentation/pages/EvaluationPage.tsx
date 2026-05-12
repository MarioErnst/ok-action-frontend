// Full module documentation: documentacion/modulos/fonacion.md
import { useState } from 'react';
import { EvaluationMenu } from '../components/organisms/EvaluationMenu';
import { EvaluationScreen } from '../components/organisms/EvaluationScreen';
import { ResultsScreen } from '../components/organisms/ResultsScreen';
import type { SessionResult, VoiceExercise } from '../../domain/PhonationSession';

type EvaluationView = 'menu' | 'evaluating' | 'results';

export default function EvaluationPage() {
  const [view, setView] = useState<EvaluationView>('menu');
  const [diagnosisResult, setDiagnosisResult] = useState<SessionResult | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<VoiceExercise[]>([]);

  return (
    <div className="flex-1 flex flex-col justify-center">
      {view === 'menu' && (
        <EvaluationMenu
          onStart={(exercises) => {
            setSelectedExercises(exercises);
            setView('evaluating');
          }}
        />
      )}

      {view === 'evaluating' && (
        <EvaluationScreen
          exercises={selectedExercises}
          onFinish={(result) => {
            setDiagnosisResult(result);
            setView('results');
          }}
        />
      )}

      {view === 'results' && (
        <ResultsScreen
          result={diagnosisResult}
          onReset={() => {
            setDiagnosisResult(null);
            setSelectedExercises([]);
            setView('menu');
          }}
        />
      )}
    </div>
  );
}
