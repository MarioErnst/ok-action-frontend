import { useState } from 'react';
import { EvaluationScreen } from '../components/organisms/EvaluationScreen';
import { ResultsScreen } from '../components/organisms/ResultsScreen';
import type { PhonationFrame } from '../types';

type EvaluationView = 'evaluating' | 'results';

export default function EvaluationPage() {
  const [view, setView] = useState<EvaluationView>('evaluating');
  const [recordedResults, setRecordedResults] = useState<Map<string, PhonationFrame[]> | null>(null);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      {view === 'evaluating' && (
        <EvaluationScreen
          onFinish={(results) => {
            setRecordedResults(results);
            setView('results');
          }}
        />
      )}

      {view === 'results' && recordedResults !== null && (
        <ResultsScreen
          recordedResults={recordedResults}
          onReset={() => {
            setRecordedResults(null);
            setView('evaluating');
          }}
        />
      )}
    </div>
  );
}
