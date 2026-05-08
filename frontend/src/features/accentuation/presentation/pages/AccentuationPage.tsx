// Full module documentation: documentacion/modulos/acentuacion.md
import { useState } from 'react';
import AccentuationResultsScreen from '../components/organisms/AccentuationResultsScreen';
import RecordingScreen from '../components/organisms/RecordingScreen';
import type { AccentuationSessionResult } from '../../types';

type AccentuationView = 'recording' | 'results';

export default function AccentuationPage() {
  const [view, setView] = useState<AccentuationView>('recording');
  const [sessionResult, setSessionResult] = useState<AccentuationSessionResult | null>(null);

  function handleSessionFinish(result: AccentuationSessionResult) {
    setSessionResult(result);
    setView('results');
  }

  function handleReset() {
    setSessionResult(null);
    setView('recording');
  }

  return (
    <div className="flex-1 flex flex-col justify-center">
      {view === 'recording' && <RecordingScreen onFinish={handleSessionFinish} />}
      {view === 'results' && sessionResult && (
        <AccentuationResultsScreen result={sessionResult} onReset={handleReset} />
      )}
    </div>
  );
}
