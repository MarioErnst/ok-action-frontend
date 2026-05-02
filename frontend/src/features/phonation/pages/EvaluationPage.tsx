import { useState, useEffect } from 'react';
import { EvaluationMenu } from '../components/organisms/EvaluationMenu';
import { useAuthStore } from '../../auth/presentation/store/authStore';
import { EvaluationScreen } from '../components/organisms/EvaluationScreen';
import { ResultsScreen } from '../components/organisms/ResultsScreen';
import type { PhonationFrame, VoiceExercise } from '../types';

type EvaluationView = 'menu' | 'evaluating' | 'results';

export default function EvaluationPage() {
  const [view, setView] = useState<EvaluationView>('menu');
  const [recordedResults, setRecordedResults] = useState<Map<string, PhonationFrame[]> | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<VoiceExercise[]>([]);
  const { user, updateUser } = useAuthStore();

  useEffect(() => {
    if (user && !user.completedExercises?.includes('fonacion')) {
      updateUser({
        completedExercises: [...(user.completedExercises || []), 'fonacion']
      });
    }
  }, [user, updateUser]);

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
