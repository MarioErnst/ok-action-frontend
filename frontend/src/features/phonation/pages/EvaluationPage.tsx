// Documentacion detallada de este modulo: documentacion/modulos/fonacion.md
import { useState } from 'react';
import { EvaluationMenu } from '../components/organisms/EvaluationMenu';
import { EvaluationScreen } from '../components/organisms/EvaluationScreen';
import { ResultsScreen } from '../components/organisms/ResultsScreen';
import type { PhonationFrame, VoiceExercise } from '../types';

type EvaluationView = 'menu' | 'evaluating' | 'results';

export default function EvaluationPage() {
  const [view, setView] = useState<EvaluationView>('menu');
  const [recordedResults, setRecordedResults] = useState<Map<string, PhonationFrame[]> | null>(null);
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
          onFinish={(results) => {
            setRecordedResults(results);
            setView('results');
          }}
        />
      )}

      {view === 'results' && recordedResults !== null && (
        <ResultsScreen
          recordedResults={recordedResults}
          exercises={selectedExercises}
          onReset={() => {
            setRecordedResults(null);
            setSelectedExercises([]);
            setView('menu');
          }}
        />
      )}
    </div>
  );
}
