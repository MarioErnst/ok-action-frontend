// Full module documentation: documentacion/modulos/acentuacion.md
import { useState } from 'react';
import { ModuleGuideLauncher } from '../../../journey';
import AccentuationResultsScreen from '../components/organisms/AccentuationResultsScreen';
import RecordingScreen from '../components/organisms/RecordingScreen';
import type { AccentuationSessionResult } from '../../domain/AccentuationSession';

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="accentuation-intro">
  <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
  <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
    <div>
      <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
      <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Acentuación</h1>
      <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Trabaja el énfasis y la acentuación correcta.</p>
    </div>
    <div className="shrink-0 mt-1">
      <ModuleGuideLauncher guideId="accentuation" />
    </div>
  </div>
</header>
      
      {view === 'recording' && <RecordingScreen onFinish={handleSessionFinish} />}
      {view === 'results' && sessionResult && (
        <div data-journey-id="accentuation-results">
          <div className="mx-auto flex w-full max-w-lg justify-end px-6 pt-4">
            
          </div>
          <AccentuationResultsScreen result={sessionResult} onReset={handleReset} />
        </div>
      )}
    </div>
  );
}

